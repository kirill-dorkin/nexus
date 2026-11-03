/** Signal helpers shared by the band and its voices. */
import type { NoteEvent } from "./composer";

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function osc(
  ctx: BaseAudioContext,
  type: OscillatorType,
  frequency: number
) {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.value = frequency;
  return node;
}

export function sendLevel(ctx: BaseAudioContext, level: number) {
  const node = ctx.createGain();
  node.gain.value = level;
  return node;
}

export function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Stereo decaying noise, darkening as it fades: a convincing small plate. */
export function impulse(ctx: BaseAudioContext, seconds: number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const darkening = 0.15 + progress * 0.8;
      smooth = smooth * darkening + (Math.random() * 2 - 1) * (1 - darkening);
      data[i] = smooth * (1 - progress) ** 2.4 * 2.2;
    }
  }
  return buffer;
}

export function crackleBuffer(
  ctx: BaseAudioContext,
  seconds: number,
  seed: number
) {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  let s = seed || 1;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pops = Math.floor(seconds * 9);
  for (let p = 0; p < pops; p++) {
    const at = Math.floor(random() * (data.length - 200));
    const size = 0.2 + random() * 0.8;
    for (let i = 0; i < 60; i++) {
      const index = at + i;
      data[index] =
        (data[index] ?? 0) + (random() * 2 - 1) * size * Math.exp(-i / 9);
    }
  }
  return buffer;
}

export function softClip(drive: number) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

/** Pitched voices always carry a MIDI note; the composer guarantees it. */
export function pitch(event: NoteEvent): number {
  if (event.midi === undefined) {
    throw new Error(`A ${event.voice} note has no pitch.`);
  }
  return event.midi;
}
