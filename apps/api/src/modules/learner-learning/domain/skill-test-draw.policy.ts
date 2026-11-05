import { createHash, randomInt } from "node:crypto";

/**
 * ADR-0075: a draw takes `size` distinct questions, preferring those this learner saw
 * least; ties are broken uniformly at random.
 */
export function pickQuestions(
  keys: readonly string[],
  timesSeen: ReadonlyMap<string, number>,
  size: number,
  random: (max: number) => number = randomInt
): string[] {
  const shuffled = [...new Set(keys)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j] as string, shuffled[i] as string];
  }
  // Array.prototype.sort is stable, so equal counts keep their random order.
  return shuffled
    .sort((a, b) => (timesSeen.get(a) ?? 0) - (timesSeen.get(b) ?? 0))
    .slice(0, size);
}

/**
 * The draw (and Attempt) id of one skill inside a branch test: derived from the learner's
 * draw key, so repeating the start with the same key finds the same draws.
 */
export function branchPartKey(drawKey: string, skillKey: string): string {
  const hex = createHash("sha256")
    .update(`skill-test-branch\u0000${drawKey}\u0000${skillKey}`)
    .digest("hex");
  // RFC 9562 version 8 (custom) with the RFC variant bits.
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
