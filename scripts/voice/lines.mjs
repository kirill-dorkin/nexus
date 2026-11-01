// Lists the story lines that get pre-rendered voice clips.
// Usage: node scripts/voice/lines.mjs [manifest] > lines.json
// Uses the same spokenText/lineId as the browser player, so clip names always match.
import { readFileSync } from "node:fs";
import { lineId, spokenText } from "../../apps/web/src/components/learning/speech-text.ts";

// Characters with a CC0 neural voice (Piper dmitri / denis). Marta and Nika use the browser voice
// until a licensed female voice is configured.
export const CLIP_VOICES = { bro: "dmitri", lev: "denis", bug: "dmitri" };

const manifest = JSON.parse(readFileSync(process.argv[2] ?? "docs/examples/html-track.manifest.json", "utf8"));
const lines = new Map();
for (const lesson of manifest.lessons)
  for (const block of lesson.blocks)
    for (const [, body] of (block.markdown ?? "").matchAll(/```story\n([\s\S]*?)\n```/g))
      for (const [who, text] of JSON.parse(body).lines)
        if (who in CLIP_VOICES) lines.set(lineId(who, text), { id: lineId(who, text), who, voice: CLIP_VOICES[who], text: spokenText(text) });
process.stdout.write(JSON.stringify([...lines.values()], null, 2) + "\n");
