import { itemAt } from "../../../lib/item-at";
import type { Token } from "../code-highlight";
import type { Scene, UrlPart } from "./model";

/** Where Emmet leaves the caret after expanding: the first empty attribute or element. */
export function caretOffset(output: string) {
  const blank = /\n( *)\n/.exec(output);
  const candidates = [
    output.indexOf('""') + 1,
    output.indexOf("></") + 1,
    blank ? blank.index + 1 + itemAt(blank, 1).length : 0
  ].filter((i) => i > 0);
  return candidates.length ? Math.min(...candidates) : output.length;
}

/** Splits highlighted tokens into lines, inserting a caret marker at a character offset. */
export function tokenLines(tokens: Token[], caretAt: number) {
  let line: (Token | "caret")[] = [];
  const lines: (Token | "caret")[][] = [line];
  let offset = 0;
  for (const token of tokens) {
    let text = token.text;
    let start = offset;
    while (text.length) {
      const breakAt = text.indexOf("\n");
      const chunkEnd = breakAt < 0 ? text.length : breakAt;
      let chunk = text.slice(0, chunkEnd);
      if (caretAt >= start && caretAt < start + chunk.length) {
        const before = chunk.slice(0, caretAt - start);
        if (before) line.push({ kind: token.kind, text: before });
        line.push("caret");
        chunk = chunk.slice(before.length);
        start += before.length;
        caretAt = -1;
      }
      if (chunk) line.push({ kind: token.kind, text: chunk });
      start += chunk.length;
      if (breakAt < 0) break;
      if (caretAt === start) {
        line.push("caret");
        caretAt = -1;
      }
      line = [];
      lines.push(line);
      start += 1;
      text = text.slice(chunkEnd + 1);
    }
    offset += token.text.length;
  }
  if (caretAt >= offset) line.push("caret");
  return lines;
}

export type Phase = "ready" | "typing" | "key" | "result";
export type Tick = { phase: Phase; typed: number; ms: number };

/** One scene as a list of timed frames: a short wait, human-paced typing, the key, the result. */
export function sceneFrames(scene: Scene): Tick[] {
  const frames: Tick[] = [{ phase: "ready", typed: 0, ms: 650 }];
  for (let i = 1; i <= scene.input.length; i++) {
    const ch = itemAt(scene.input, i - 1);
    // Symbols take a moment longer than letters, like a real person typing.
    frames.push({
      phase: "typing",
      typed: i,
      ms: /[a-z0-9]/i.test(ch) ? 95 : 190
    });
  }
  frames.push({ phase: "typing", typed: scene.input.length, ms: 650 });
  if (scene.key)
    frames.push({ phase: "key", typed: scene.input.length, ms: 650 });
  frames.push({ phase: "result", typed: scene.input.length, ms: 0 });
  return frames;
}

export const STAGES: { phase: Phase[]; label: string }[] = [
  { phase: ["ready", "typing"], label: "Печатаем" },
  { phase: ["key"], label: "Жмём" },
  { phase: ["result"], label: "Результат" }
];

/** Offset of each part inside the abbreviation. */
export function partStarts(parts: readonly UrlPart[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const part of parts) {
    starts.push(offset);
    offset += part.text.length;
  }
  return starts;
}
