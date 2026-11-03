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
import {
  BAR_STEPS,
  composeBar,
  sixteenth,
  stepTime,
  type Bar,
  type NoteEvent
} from "./composer";
import {
  crackleBuffer,
  hz,
  impulse,
  noiseBuffer,
  osc,
  pitch,
  sendLevel,
  softClip
} from "./dsp";
import { bass, bell, hat, keys, kick, snare, type Mixer } from "./voices";

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

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly seed: number
  ) {
    const gain = (value: number) => {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    };
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
    sum
      .connect(wow)
      .connect(this.tone)
      .connect(lowCut)
      .connect(glue)
      .connect(ceiling)
      .connect(this.output);

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
    this.melodyBus
      .connect(echo)
      .connect(echoTone)
      .connect(feedback)
      .connect(echo);
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
      this.tone.frequency.setTargetAtTime(
        1600 + bar.brightness * 3200,
        time,
        1.2
      );
    }
    this.duck = this.ctx.createGain();
    this.duck.connect(this.keysBus);
    for (const event of bar.events)
      this.play(event, time + Math.max(0, stepTime(event.step)));
    return bar;
  }

  /** Duration of one bar in seconds. */
  static barSeconds() {
    return BAR_STEPS * sixteenth();
  }

  stop(time: number) {
    for (const source of this.sources.splice(0)) {
      try {
        source.stop(time);
      } catch {
        /* already stopped */
      }
    }
  }

  private mixer(): Mixer {
    return {
      ctx: this.ctx,
      noise: this.noise,
      keys: this.keysBus,
      bass: this.bassBus,
      drums: this.drumBus,
      melody: this.melodyBus,
      duck: this.duck
    };
  }

  private play(event: NoteEvent, t: number) {
    const length = event.length * sixteenth();
    switch (event.voice) {
      case "keys":
        keys(this.mixer(), hz(pitch(event)), t, length, event.velocity);
        break;
      case "bass":
        bass(this.mixer(), hz(pitch(event)), t, length, event.velocity);
        break;
      case "kick":
        kick(this.mixer(), t, event.velocity);
        break;
      case "snare":
        snare(this.mixer(), t, event.velocity);
        break;
      case "hat":
        hat(this.mixer(), t, event.velocity);
        break;
      case "melody":
        bell(this.mixer(), hz(pitch(event)), t, length, event.velocity);
        break;
    }
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
}
