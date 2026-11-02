/*
 * Composer for the "coffee shop" lo-fi: decides WHAT plays in each bar, never HOW it sounds.
 * Pure and deterministic: the same seed and bar index always give the same notes, so the
 * music can be tested, and a bar can be composed again after the tab wakes up.
 *
 * Form: an 8-bar intro, then a loop of 8-bar sections (groove → lift → groove → breakdown),
 * each on one of three jazzy progressions played twice. Drums, bass and keys are humanised;
 * the melody is written in two-bar call-and-response phrases on the C major pentatonic.
 */

export type Voice = "keys" | "bass" | "kick" | "snare" | "hat" | "melody";
export type NoteEvent = {
  voice: Voice;
  /** Position in sixteenths from the bar start (fractions are humanisation). */
  step: number;
  /** Length in sixteenths. */
  length: number;
  /** 0..1 */
  velocity: number;
  midi?: number;
};
export type SectionKind = "intro" | "groove" | "lift" | "breakdown";
export type Bar = { index: number; section: SectionKind; chord: Chord; events: NoteEvent[]; brightness: number };
export type Chord = { name: string; bass: number; voicing: readonly number[] };

export const BAR_STEPS = 16;
export const SECTION_BARS = 8;
export const TEMPO = 74;

const ch = (name: string, bass: number, ...voicing: number[]): Chord => ({ name, bass, voicing });
/** Rootless voicings around middle C with smooth voice leading; the bass plays the root. */
export const PROGRESSIONS: readonly (readonly Chord[])[] = [
  [ch("Fmaj9", 41, 57, 60, 64, 67), ch("Em7", 40, 55, 59, 62, 64), ch("Dm9", 38, 53, 57, 60, 64), ch("Cmaj9", 36, 52, 55, 59, 62)],
  [ch("Dm9", 38, 53, 57, 60, 64), ch("G13", 43, 53, 57, 59, 64), ch("Cmaj9", 36, 52, 55, 59, 62), ch("Am9", 45, 55, 59, 60, 64)],
  [ch("B♭maj9", 46, 57, 60, 62, 65), ch("Am7", 45, 55, 57, 60, 64), ch("Gm9", 43, 53, 57, 58, 62), ch("C9", 36, 58, 62, 64, 67)]
];
/** C major pentatonic, G3–A5: sits over every chord above. */
export const MELODY_SCALE: readonly number[] = [67, 69, 72, 74, 76, 79, 81, 84, 86];
const CYCLE: readonly SectionKind[] = ["groove", "lift", "groove", "breakdown"];

/** mulberry32: a tiny, good-enough seeded generator. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mix = (...parts: number[]) => parts.reduce((h, p) => Math.imul(h ^ (p >>> 0), 0x9e3779b1) >>> 0, 0x811c9dc5);

export function sectionOf(bar: number): { index: number; kind: SectionKind } {
  const index = Math.floor(bar / SECTION_BARS);
  return { index, kind: index === 0 ? "intro" : CYCLE[(index - 1) % CYCLE.length]! };
}

/** Each section picks a progression, never the same one twice in a row. */
export function progressionOf(section: number, seed: number): number {
  if (section === 0) return 0;
  const previous = progressionOf(section - 1, seed);
  const shift = 1 + Math.floor(rng(mix(seed, section, 7))() * (PROGRESSIONS.length - 1));
  return (previous + shift) % PROGRESSIONS.length;
}

export function composeBar(index: number, seed: number): Bar {
  const { index: sectionIndex, kind } = sectionOf(index);
  const progression = PROGRESSIONS[progressionOf(sectionIndex, seed)]!;
  const inSection = index % SECTION_BARS;
  const chord = progression[inSection % progression.length]!;
  const next = progression[(inSection + 1) % progression.length]!;
  const r = rng(mix(seed, index));
  const human = (spread: number) => (r() - 0.5) * spread;
  const events: NoteEvent[] = [];
  const drums = kind === "groove" || kind === "lift";
  const lastOfSection = inSection === SECTION_BARS - 1;

  // Keys: the chord on the downbeat, a softer re-hit later in the bar; strummed slightly.
  const strum = (step: number, velocity: number, length: number) =>
    chord.voicing.forEach((midi, i) => events.push({ voice: "keys", midi, step: step + i * 0.06 + human(0.08), length, velocity: velocity * (0.9 + r() * 0.2) }));
  strum(0, kind === "breakdown" ? 0.55 : 0.7, kind === "intro" ? 15 : 9);
  if (kind !== "intro" && r() < 0.65) strum(r() < 0.5 ? 10 : 11, 0.42, 4);

  // Bass: root, a push before beat 3, sometimes a chromatic approach into the next chord.
  if (kind !== "breakdown" || inSection % 2 === 0) {
    events.push({ voice: "bass", midi: chord.bass, step: human(0.1), length: kind === "intro" || kind === "breakdown" ? 14 : 6, velocity: 0.85 });
    if (kind !== "intro") {
      events.push({ voice: "bass", midi: r() < 0.7 ? chord.bass : chord.bass + 7, step: 7 + human(0.1), length: 3, velocity: 0.6 });
      if (r() < 0.45) {
        const approach = next.bass + (next.bass > chord.bass ? -1 : 1);
        events.push({ voice: "bass", midi: approach, step: 14 + human(0.1), length: 2, velocity: 0.55 });
      }
    }
  }

  // Drums: laid-back boom-bap with ghost notes; fills open up the last bar of a section.
  if (drums) {
    events.push({ voice: "kick", step: 0, length: 2, velocity: 0.95 });
    if (r() < 0.55) events.push({ voice: "kick", step: 7, length: 1, velocity: 0.55 });
    events.push({ voice: "kick", step: 10, length: 2, velocity: 0.8 });
    for (const step of [4, 12]) events.push({ voice: "snare", step: step + 0.12 + human(0.06), length: 2, velocity: 0.8 + human(0.1) });
    for (let step = 0; step < BAR_STEPS; step += 2) {
      if (lastOfSection && step >= 12) break;
      events.push({ voice: "hat", step: step + human(0.06), length: 1, velocity: step % 4 === 0 ? 0.5 : 0.75 + human(0.15) });
      if (r() < (kind === "lift" ? 0.35 : 0.2)) events.push({ voice: "hat", step: step + 1 + human(0.06), length: 1, velocity: 0.28 });
    }
    if (lastOfSection) for (const step of [13, 14, 15]) events.push({ voice: "snare", step, length: 1, velocity: 0.3 + (step - 13) * 0.15 });
  } else if (kind === "breakdown") {
    for (let step = 0; step < BAR_STEPS; step += 4) events.push({ voice: "hat", step: step + 2, length: 1, velocity: 0.35 });
  }

  if (kind !== "intro") events.push(...melody(index, seed, kind));
  events.sort((a, b) => a.step - b.step);
  return { index, section: kind, chord, events, brightness: kind === "breakdown" ? 0.35 : kind === "intro" ? 0.55 : kind === "lift" ? 1 : 0.8 };
}

/** Two-bar phrases: the first bar asks (ends high), the second answers (falls back home). */
function melody(index: number, seed: number, kind: SectionKind): NoteEvent[] {
  const phrase = Math.floor(index / 2);
  const answer = index % 2 === 1;
  const r = rng(mix(seed, phrase, 31));
  // The same draws for both bars of a phrase keep it coherent; the answer then diverges.
  const rests = kind === "lift" ? 0.35 : kind === "breakdown" ? 0.75 : 0.55;
  if (r() < (kind === "breakdown" ? 0.5 : 0.15)) return [];
  const slots = [0, 2, 3, 6, 8, 10, 11, 14];
  let degree = 2 + Math.floor(r() * 4);
  const own = rng(mix(seed, index, 57));
  const notes: NoteEvent[] = [];
  for (const step of slots) {
    if (own() < rests) continue;
    const move = answer ? (own() < 0.65 ? -1 : 1) : (own() < 0.6 ? 1 : -1);
    degree = Math.min(MELODY_SCALE.length - 1, Math.max(0, degree + move * (own() < 0.25 ? 2 : 1)));
    notes.push({ voice: "melody", midi: MELODY_SCALE[degree]!, step: step + (own() - 0.5) * 0.1, length: 3, velocity: 0.45 + own() * 0.3 });
  }
  return notes;
}

/** Seconds per sixteenth at the song tempo. */
export const sixteenth = () => 60 / TEMPO / 4;
/** Lazy swing: off-beat sixteenths land later (as a fraction of a sixteenth). */
export const SWING = 0.16;
/** Where a step lands in seconds from the bar start, with swing applied to off-beats. */
export function stepTime(step: number): number {
  const whole = Math.floor(step);
  const offbeat = whole % 2 === 1 ? SWING : 0;
  return (step + offbeat) * sixteenth();
}
