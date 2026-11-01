"""Renders voice clips for story lines with Piper (CC0 voices) and ffmpeg.

Usage:
  node scripts/voice/lines.mjs > /tmp/lines.json
  python scripts/voice/render.py /tmp/lines.json <dir with ru_RU-*-medium.onnx> apps/web/public/voice/html

Voices (rhasspy/piper-voices, CC0 datasets): ru_RU-dmitri-medium, ru_RU-denis-medium.
Each character gets a light ffmpeg treatment so the cast is recognisable by ear.
Existing clips are kept (delete them to re-render); index.json lists every clip id the site may play.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

# Brisk, lively delivery: a touch faster than the model default, with less monotone.
SYNTHESIS = SynthesisConfig(length_scale=0.86, noise_scale=0.7, noise_w_scale=0.85)
# Trim silence at both ends so lines follow each other without dead air.
TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")

FILTERS = {
    # Bro the browser: a slightly metallic, bright robot.
    "bro": "aecho=0.8:0.7:7:0.25,highpass=f=140,lowpass=f=7000",
    # Lev: natural and warm.
    "lev": "highpass=f=70",
    # The Evil Script: lower, slower, with a dark echo.
    "bug": "asetrate=22050*0.84,aresample=22050,atempo=1.12,aecho=0.8:0.5:60:0.25,highpass=f=60",
}


def main(lines_path: str, voices_dir: str, out_dir: str) -> None:
    lines = json.loads(Path(lines_path).read_text())
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    loaded: dict[str, PiperVoice] = {}
    for line in lines:
        target = out / f"{line['id']}.mp3"
        if target.exists():
            continue
        voice = loaded.setdefault(line["voice"], PiperVoice.load(str(Path(voices_dir) / f"ru_RU-{line['voice']}-medium.onnx")))
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            with wave.open(tmp.name, "wb") as wav:
                voice.synthesize_wav(line["text"], wav, syn_config=SYNTHESIS)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name,
                 "-af", f"{TRIM},{FILTERS[line['who']]},loudnorm=I=-17:TP=-1.5",
                 "-ac", "1", "-ar", "22050", "-b:a", "48k", str(target)],
                check=True,
            )
        print(f"{line['who']:4} {line['id']}  {line['text'][:60]}")
    ids = sorted(p.stem for p in out.glob("*.mp3"))
    (out / "index.json").write_text(json.dumps(ids) + "\n")
    print(f"{len(ids)} clips")


if __name__ == "__main__":
    main(*sys.argv[1:4])
