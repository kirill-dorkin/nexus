/*
 * The "band": turns composed bars into sound with Web Audio. Works on any BaseAudioContext,
 * so the same code plays live in the page and renders offline (OfflineAudioContext) for checks.
 *
 * Signal flow:
 *   keys (FM electric piano, stereo tremolo) ─┐ ducked by the kick
 *   bass (sine + soft saturation) ────────────┤
 *   drums (kick, snare, hats) ────────────────┼─▶ tape wow ─▶ tone (low-pass) ─▶ glue compressor ─▶ out
 *   melody (soft bell) ─▶ delay ──────────────┤
 *   reverb send (generated plate) ────────────┤
 *   vinyl (hiss + crackle loop) ──────────────┘
 */
import { BAR_STEPS, composeBar, sixteenth, stepTime, type Bar, type NoteEvent } from "./composer";

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Band {
  readonly output: GainNode;
  private readonly keysBus: GainNode;
  /** The kick ducks the keys through a gain node that lives for one bar only, so automation
   *  events never pile up on a long-lived parameter during hours of playback. */
  private duck: GainNode | null = null;
  private brightness = -1;
  private readonly bassBus: GainNode;
  private readonly drumBus: GainNode;
  private readonly melodyBus: GainNode;
  private readonly reverbSend: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly noise: AudioBuffer;
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(private readonly ctx: BaseAudioContext, private readonly seed: number) {
    const gain = (value: number) => { const g = ctx.createGain(); g.gain.value = value; return g; };
    this.output = gain(0.8);
    this.noise = noiseBuffer(ctx, 2);

    // Master: tape wow → tone → glue compressor → limiter-ish ceiling.
    const sum = gain(1);
    const wow = ctx.createDelay(0.05);
    wow.delayTime.value = 0.012;
    this.lfo(0.55, 0.0016, wow.delayTime);
    this.lfo(5.3, 0.00012, wow.delayTime);
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 4200;
    this.tone.Q.value = 0.5;
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = "highpass";
    lowCut.frequency.value = 32;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.ratio.value = 2.5;
    glue.attack.value = 0.02;
    glue.release.value = 0.25;
    const ceiling = ctx.createDynamicsCompressor();
    ceiling.threshold.value = -3;
    ceiling.knee.value = 0;
    ceiling.ratio.value = 20;
    ceiling.attack.value = 0.002;
    ceiling.release.value = 0.1;
    sum.connect(wow).connect(this.tone).connect(lowCut).connect(glue).connect(ceiling).connect(this.output);

    // Reverb: a generated stereo plate, darkened, as a shared send.
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 2.6);
    this.reverbSend = gain(1);
    const reverbReturn = gain(0.55);
    this.reverbSend.connect(reverb).connect(reverbReturn).connect(sum);

    // Keys: stereo tremolo and a sidechain duck from the kick.
    this.keysBus = gain(2.2);
    const pan = ctx.createStereoPanner();
    this.lfo(0.18, 0.35, pan.pan);
    this.keysBus.connect(pan).connect(sum);
    pan.connect(sendLevel(ctx, 0.35)).connect(this.reverbSend);

    this.bassBus = gain(0.3);
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip(1.6);
    shaper.oversample = "2x";
    const bassTone = ctx.createBiquadFilter();
    bassTone.type = "lowpass";
    bassTone.frequency.value = 700;
    this.bassBus.connect(shaper).connect(bassTone).connect(sum);

    this.drumBus = gain(0.6);
    this.drumBus.connect(sum);
    this.drumBus.connect(sendLevel(ctx, 0.12)).connect(this.reverbSend);

    // Melody: dotted-eighth echo, darkened in the feedback loop, plus a generous reverb send.
    this.melodyBus = gain(0.9);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = sixteenth() * 3;
    const feedback = gain(0.32);
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = "lowpass";
    echoTone.frequency.value = 2200;
    this.melodyBus.connect(sum);
    this.melodyBus.connect(echo).connect(echoTone).connect(feedback).connect(echo);
    echoTone.connect(sendLevel(ctx, 0.5)).connect(sum);
    this.melodyBus.connect(sendLevel(ctx, 0.6)).connect(this.reverbSend);

    this.vinyl(sum);
  }

  /** Schedules one bar starting at `time` (seconds on the context clock). */
  playBar(index: number, time: number): Bar {
    const bar = composeBar(index, this.seed);
    // The tone changes only between sections; one automation event per change, not per bar.
    if (bar.brightness !== this.brightness) {
      this.brightness = bar.brightness;
      this.tone.frequency.setTargetAtTime(1600 + bar.brightness * 3200, time, 1.2);
    }
    this.duck = this.ctx.createGain();
    this.duck.connect(this.keysBus);
    for (const event of bar.events) this.play(event, time + Math.max(0, stepTime(event.step)));
    return bar;
  }

  /** Duration of one bar in seconds. */
  static barSeconds() {
    return BAR_STEPS * sixteenth();
  }

  stop(time: number) {
    for (const source of this.sources.splice(0)) {
      try { source.stop(time); } catch { /* already stopped */ }
    }
  }

  private play(event: NoteEvent, t: number) {
    const length = event.length * sixteenth();
    switch (event.voice) {
      case "keys": return this.keys(hz(event.midi!), t, length, event.velocity);
      case "bass": return this.bass(hz(event.midi!), t, length, event.velocity);
      case "kick": return this.kick(t, event.velocity);
      case "snare": return this.snare(t, event.velocity);
      case "hat": return this.hat(t, event.velocity);
      case "melody": return this.bell(hz(event.midi!), t, length, event.velocity);
    }
  }

  /** FM electric piano: a sine carrier with a decaying sine modulator gives the "tine" bark. */
  private keys(f: number, t: number, length: number, velocity: number) {
    const { ctx } = this;
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
    carrier.connect(env).connect(this.duck ?? this.keysBus);
    this.run(t, t + length + release * 2, carrier, modulator, warmth);
  }

  private bass(f: number, t: number, length: number, velocity: number) {
    const { ctx } = this;
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
    body.connect(env).connect(this.bassBus);
    this.run(t, t + length + 0.4, body, edge);
  }

  private kick(t: number, velocity: number) {
    const { ctx } = this;
    const body = osc(ctx, "sine", 140);
    body.frequency.setValueAtTime(140, t);
    body.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1.13 * velocity, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    body.connect(env).connect(this.drumBus);
    this.run(t, t + 0.45, body);
    this.noiseHit(t, "highpass", 3000, 0.12 * velocity, 0.012, this.drumBus);
    // Sidechain: the keys of this bar dip under the kick and breathe back.
    if (this.duck) {
      this.duck.gain.setValueAtTime(1, t);
      this.duck.gain.linearRampToValueAtTime(1 - 0.32 * velocity, t + 0.02);
      this.duck.gain.linearRampToValueAtTime(1, t + 0.32);
    }
  }

  private snare(t: number, velocity: number) {
    const { ctx } = this;
    this.noiseHit(t, "bandpass", 1900, 2.1 * velocity, 0.2, this.drumBus, 0.8);
    const body = osc(ctx, "triangle", 190);
    body.frequency.setValueAtTime(190, t);
    body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1.2 * velocity, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    body.connect(env).connect(this.drumBus);
    this.run(t, t + 0.15, body);
  }

  private hat(t: number, velocity: number) {
    this.noiseHit(t, "highpass", 7500, 3.8 * velocity, 0.035 + velocity * 0.03, this.drumBus);
  }

  /** Soft bell: fundamental plus a quickly fading inharmonic partial. */
  private bell(f: number, t: number, length: number, velocity: number) {
    const { ctx } = this;
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
    fundamental.connect(env).connect(this.melodyBus);
    this.run(t, t + length + 2, fundamental, partial);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number, to: AudioNode, q = 0.7) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
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

  /** Vinyl: a quiet hiss bed plus sparse crackle, looped. */
  private vinyl(to: AudioNode) {
    const { ctx } = this;
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noise;
    hiss.loop = true;
    const hissTone = ctx.createBiquadFilter();
    hissTone.type = "bandpass";
    hissTone.frequency.value = 3500;
    hissTone.Q.value = 0.4;
    const hissLevel = ctx.createGain();
    hissLevel.gain.value = 0.006;
    hiss.connect(hissTone).connect(hissLevel).connect(to);
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer(ctx, 5, this.seed);
    crackle.loop = true;
    const crackleLevel = ctx.createGain();
    crackleLevel.gain.value = 0.05;
    crackle.connect(crackleLevel).connect(to);
    hiss.start();
    crackle.start();
    this.sources.push(hiss, crackle);
  }

  private lfo(rate: number, depth: number, target: AudioParam) {
    const { ctx } = this;
    const source = osc(ctx, "sine", rate);
    const amount = ctx.createGain();
    amount.gain.value = depth;
    source.connect(amount).connect(target);
    source.start();
    this.sources.push(source);
  }

  private run(start: number, end: number, ...nodes: OscillatorNode[]) {
    for (const node of nodes) {
      node.start(start);
      node.stop(end);
    }
  }
}

function osc(ctx: BaseAudioContext, type: OscillatorType, frequency: number) {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.value = frequency;
  return node;
}

function sendLevel(ctx: BaseAudioContext, level: number) {
  const node = ctx.createGain();
  node.gain.value = level;
  return node;
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Stereo decaying noise, darkening as it fades: a convincing small plate. */
function impulse(ctx: BaseAudioContext, seconds: number) {
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

function crackleBuffer(ctx: BaseAudioContext, seconds: number, seed: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let s = seed || 1;
  const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pops = Math.floor(seconds * 9);
  for (let p = 0; p < pops; p++) {
    const at = Math.floor(random() * (data.length - 200));
    const size = 0.2 + random() * 0.8;
    for (let i = 0; i < 60; i++) data[at + i]! += (random() * 2 - 1) * size * Math.exp(-i / 9);
  }
  return buffer;
}

function softClip(drive: number) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}
