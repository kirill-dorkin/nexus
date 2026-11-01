// Voices story lines with ElevenLabs into apps/web/public/voice/html/<lineId>.mp3.
//
// Usage (the key is read from the environment, never from the repository):
//   ELEVENLABS_API_KEY=sk_… node scripts/voice/elevenlabs.mjs [--lessons 10] [--force] [--dry-run]
//
// Each character has a native Russian voice from the ElevenLabs library (added to the account
// on first use). Existing clips are skipped unless --force. The player picks clips by lineId, so
// nothing else needs to change; index.json is rewritten to list every clip on disk.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lineId, spokenText } from "../../apps/web/src/components/learning/speech-text.ts";

const CAST = {
  marta: { voice: "ymDCYd8puC7gYjxIamPt", name: "Marina", gender: "female", settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 } },
  nika: { voice: "gedzfqL7OGdPbwm0ynTP", name: "Nadia", gender: "female", settings: { stability: 0.4, similarity_boost: 0.8, style: 0.4 } },
  bro: { voice: "kwajW3Xh5svCeKU5ky2S", name: "Dmitry", gender: "male", settings: { stability: 0.5, similarity_boost: 0.8, style: 0.35 }, filter: "aecho=0.8:0.6:5:0.18" },
  lev: { voice: "ogi2DyUAKJb7CEdqqvlU", name: "Stanislav", gender: "male", settings: { stability: 0.55, similarity_boost: 0.8, style: 0.2 } },
  bug: { voice: "6A9D8WSMm4rFsg2DWFeE", name: "Egor", gender: "male", settings: { stability: 0.35, similarity_boost: 0.8, style: 0.6 }, filter: "asetrate=44100*0.9,aresample=44100,atempo=1.11,aecho=0.8:0.4:50:0.2" }
};
const MODEL = "eleven_multilingual_v2";
const OUT = "apps/web/public/voice/html";

const args = process.argv.slice(2);
const lessonsLimit = args.includes("--lessons") ? Number(args[args.indexOf("--lessons") + 1]) : Infinity;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const key = process.env.ELEVENLABS_API_KEY;
if (!key && !dryRun) throw new Error("Set ELEVENLABS_API_KEY.");

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { "xi-api-key": key, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
};

/** Library voices must be in the account before the TTS endpoint accepts them. */
async function ensureVoices(needed) {
  const mine = new Set(((await (await api("/v1/voices")).json()).voices ?? []).map((v) => v.voice_id));
  for (const who of needed) {
    const c = CAST[who];
    if (mine.has(c.voice)) continue;
    const found = await (await api(`/v1/shared-voices?language=ru&gender=${c.gender}&page_size=100&search=${encodeURIComponent(c.name)}`)).json();
    const shared = found.voices?.find((v) => v.voice_id === c.voice);
    if (!shared) throw new Error(`Library voice ${c.name} (${c.voice}) not found`);
    await api(`/v1/voices/add/${shared.public_owner_id}/${c.voice}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: `Zerno ${c.name}` })
    });
    console.log(`added voice ${c.name} for ${who}`);
  }
}

const manifest = JSON.parse(readFileSync("docs/examples/html-track.manifest.json", "utf8"));
const lines = [];
for (const lesson of manifest.lessons.slice(0, lessonsLimit))
  for (const block of lesson.blocks)
    for (const [, body] of (block.markdown ?? "").matchAll(/```story\n([\s\S]*?)\n```/g))
      for (const [who, text] of JSON.parse(body).lines)
        if (who in CAST) lines.push({ id: lineId(who, text), who, text: spokenText(text) });
const todo = [...new Map(lines.map((l) => [l.id, l])).values()].filter((l) => force || !existsSync(join(OUT, `${l.id}.mp3`)));
const chars = todo.reduce((sum, l) => sum + l.text.length, 0);
console.log(`${todo.length} lines, ${chars} characters`);
if (dryRun) process.exit(0);

await ensureVoices(new Set(todo.map((l) => l.who)));
const tmp = mkdtempSync(join(tmpdir(), "voice-"));
for (const line of todo) {
  const c = CAST[line.who];
  const res = await api(`/v1/text-to-speech/${c.voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: line.text, model_id: MODEL, language_code: "ru", voice_settings: { ...c.settings, use_speaker_boost: true } })
  });
  const raw = join(tmp, `${line.id}.mp3`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // Trim edge silence, apply the character treatment, even out loudness, compress for the web.
  const filter = ["silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse", c.filter, "loudnorm=I=-17:TP=-1.5"].filter(Boolean).join(",");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-af", filter, "-ac", "1", "-ar", "44100", "-b:a", "64k", join(OUT, `${line.id}.mp3`)]);
  console.log(`${line.who.padEnd(5)} ${line.id}  ${line.text.slice(0, 60)}`);
}
const ids = readdirSync(OUT).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)).sort();
writeFileSync(join(OUT, "index.json"), JSON.stringify(ids) + "\n");
console.log(`${ids.length} clips in ${OUT}`);
