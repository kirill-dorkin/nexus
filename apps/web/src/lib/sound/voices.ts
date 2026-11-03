/*
 * The instruments of the band. Each schedules its notes on the context clock
 * and routes them into its bus of the mix.
 */
import { osc } from "./dsp";

/** Where the voices play: the audio context and the buses of the mix. */
export type Mixer = {
  ctx: BaseAudioContext;
  noise: AudioBuffer;
  keys: AudioNode;
  bass: AudioNode;
  drums: AudioNode;
  melody: AudioNode;
  /** This bar's sidechain gain on the keys, ducked by the kick. */
  duck: GainNode | null;
};

/** FM electric piano: a sine carrier with a decaying sine modulator gives the "tine" bark. */
export function keys(
  m: Mixer,
  f: number,
  t: number,
  length: number,
  velocity: number
) {
  const { ctx } = m;
  const peak = 0.11 * velocity;
  const release = 0.35;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.006);
  env.gain.setTargetAtTime(peak * 0.38, t + 0.006, 0.45);
  env.gain.setTargetAtTime(0, t + length, release / 3);
  const carrier = osc(ctx, "sine", f);
  const modulator = osc(ctx, "sine", f);
  const index = ctx.createGain();
  index.gain.setValueAtTime(f * (0.9 + velocity * 1.4), t);
  index.gain.setTargetAtTime(f * 0.12, t, 0.35);
  modulator.connect(index).connect(carrier.frequency);
  const warmth = osc(ctx, "triangle", f / 2);
  const warmthLevel = ctx.createGain();
  warmthLevel.gain.value = 0.18;
  warmth.connect(warmthLevel).connect(env);
  carrier.connect(env).connect(m.duck ?? m.keys);
  run(t, t + length + release * 2, carrier, modulator, warmth);
}

export function bass(
  m: Mixer,
  f: number,
  t: number,
  length: number,
  velocity: number
) {
  const { ctx } = m;
  const env = ctx.createGain();
  const peak = 0.5 * velocity;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.012);
  env.gain.setTargetAtTime(peak * 0.6, t + 0.012, 0.25);
  env.gain.setTargetAtTime(0, t + length * 0.9, 0.06);
  const body = osc(ctx, "sine", f);
  const edge = osc(ctx, "triangle", f * 2);
  const edgeLevel = ctx.createGain();
  edgeLevel.gain.value = 0.12;
  edge.connect(edgeLevel).connect(env);
  body.connect(env).connect(m.bass);
  run(t, t + length + 0.4, body, edge);
}

export function kick(m: Mixer, t: number, velocity: number) {
  const { ctx } = m;
  const body = osc(ctx, "sine", 140);
  body.frequency.setValueAtTime(140, t);
  body.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1.13 * velocity, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  body.connect(env).connect(m.drums);
  run(t, t + 0.45, body);
  noiseHit(m, t, "highpass", 3000, 0.12 * velocity, 0.012, m.drums);
  // Sidechain: the keys of this bar dip under the kick and breathe back.
  if (m.duck) {
    m.duck.gain.setValueAtTime(1, t);
    m.duck.gain.linearRampToValueAtTime(1 - 0.32 * velocity, t + 0.02);
    m.duck.gain.linearRampToValueAtTime(1, t + 0.32);
  }
}

export function snare(m: Mixer, t: number, velocity: number) {
  const { ctx } = m;
  noiseHit(m, t, "bandpass", 1900, 2.1 * velocity, 0.2, m.drums, 0.8);
  const body = osc(ctx, "triangle", 190);
  body.frequency.setValueAtTime(190, t);
  body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1.2 * velocity, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  body.connect(env).connect(m.drums);
  run(t, t + 0.15, body);
}

export function hat(m: Mixer, t: number, velocity: number) {
  noiseHit(
    m,
    t,
    "highpass",
    7500,
    3.8 * velocity,
    0.035 + velocity * 0.03,
    m.drums
  );
}

/** Soft bell: fundamental plus a quickly fading inharmonic partial. */
export function bell(
  m: Mixer,
  f: number,
  t: number,
  length: number,
  velocity: number
) {
  const { ctx } = m;
  const env = ctx.createGain();
  const peak = 0.14 * velocity;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.008);
  env.gain.setTargetAtTime(0, t + 0.02, Math.max(0.25, length * 0.6));
  const fundamental = osc(ctx, "sine", f);
  const partial = osc(ctx, "sine", f * 3.01);
  const partialEnv = ctx.createGain();
  partialEnv.gain.setValueAtTime(0.25, t);
  partialEnv.gain.setTargetAtTime(0, t, 0.08);
  partial.connect(partialEnv).connect(env);
  fundamental.connect(env).connect(m.melody);
  run(t, t + length + 2, fundamental, partial);
}

function noiseHit(
  m: Mixer,
  t: number,
  type: BiquadFilterType,
  freq: number,
  peak: number,
  decay: number,
  to: AudioNode,
  q = 0.7
) {
  const { ctx } = m;
  const src = ctx.createBufferSource();
  src.buffer = m.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(filter).connect(env).connect(to);
  src.start(t, (t * 7.31) % 1.5);
  src.stop(t + decay + 0.05);
}

function run(start: number, end: number, ...nodes: OscillatorNode[]) {
  for (const node of nodes) {
    node.start(start);
    node.stop(end);
  }
}
