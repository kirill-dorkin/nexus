"use client";

import { brand } from "@platform/brand";
import { lineId, spokenText } from "../../components/learning/speech-text";

/*
 * Lesson sound: generative "coffee shop" music (Web Audio, no files, no licences) and character
 * voices (pre-rendered CC0 clips when available, the browser's own Russian voice otherwise).
 * A module singleton, so music keeps playing across client-side lesson navigation.
 * Everything is opt-in: browsers block audio without a gesture, and surprise sound is rude.
 */

export type SoundSettings = { music: boolean; voice: boolean; musicVolume: number; voiceVolume: number; rate: number };
// On by default: sound is part of the course. Browsers still need one gesture before any audio,
// so playback starts on the first click or key press (see unlockSound).
const DEFAULTS: SoundSettings = { music: true, voice: true, musicVolume: 0.3, voiceVolume: 0.9, rate: 1.1 };
// v2: the old key stored "off" as the former default, which would hide the new default.
const KEY = `${brand.slug}:sound:v2`;

let settings: SoundSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    settings = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SoundSettings>) };
  } catch {
    settings = DEFAULTS;
  }
}
export function getSoundSettings(): SoundSettings {
  load();
  return settings;
}
export const getServerSoundSettings = (): SoundSettings => DEFAULTS;
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
/* Browsers allow audio only after a user gesture on the page. */
let unlocked = false;
export const isSoundUnlocked = () => unlocked;
export function unlockSound() {
  if (unlocked) return;
  unlocked = true;
  music.apply();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  for (const listener of listeners) listener();
}
let snapshot = { settings: DEFAULTS, unlocked: false };
/** Settings plus the unlock state, as one stable snapshot for useSyncExternalStore. */
export function getSoundState() {
  const current = getSoundSettings();
  if (snapshot.settings !== current || snapshot.unlocked !== unlocked) snapshot = { settings: current, unlocked };
  return snapshot;
}
const serverState = { settings: DEFAULTS, unlocked: false };
export const getServerSoundState = () => serverState;

export function updateSound(patch: Partial<SoundSettings>) {
  load();
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this page only */
  }
  music.apply();
  if (!settings.voice) stopSpeech();
  for (const listener of listeners) listener();
}

/* ------------------------------ Music ------------------------------ */

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Fmaj7 – Em7 – Dm7 – Cmaj7: warm, unresolved, loops forever without getting tiring.
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const BASS = [41, 40, 38, 36];
const MELODY = [72, 74, 76, 79, 81, 84];
const BPM = 70;

class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextStep = 0;
  private step = 0;
  private ducked = false;
  private vinyl: AudioBufferSourceNode | null = null;
  playing = false;

  private setup() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const bus = ctx.createGain();
    bus.connect(tone).connect(compressor).connect(master).connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    Object.assign(this, { ctx, master, bus, noise });
    return ctx;
  }

  /** Follows the settings: starts, stops or changes volume. Must first run inside a user gesture. */
  apply() {
    if (!unlocked) return;
    const s = getSoundSettings();
    if (s.music) void this.start();
    else this.stop();
    this.level();
  }
  private level() {
    if (!this.ctx || !this.master) return;
    const s = getSoundSettings();
    const target = s.music ? s.musicVolume * 0.55 * (this.ducked ? 0.35 : 1) : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }
  duck(on: boolean) {
    this.ducked = on;
    this.level();
  }
  async start() {
    const ctx = this.setup();
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    if (this.playing) return;
    this.playing = true;
    this.nextStep = ctx.currentTime + 0.1;
    this.startVinyl();
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.vinyl?.stop(this.ctx.currentTime + 1);
    this.vinyl = null;
  }
  /** Is the browser still waiting for a gesture before it lets us play? */
  get blocked() {
    return this.playing && this.ctx?.state === "suspended";
  }

  private schedule() {
    const ctx = this.ctx!;
    const sixteenth = 60 / BPM / 4;
    while (this.nextStep < ctx.currentTime + 0.2) {
      this.playStep(this.step, this.nextStep);
      // Lazy swing: off-beat sixteenths land a little late.
      this.nextStep += sixteenth * (this.step % 2 === 0 ? 1.18 : 0.82);
      this.step = (this.step + 1) % 64;
    }
  }
  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const chord = CHORDS[bar]!;
    if (inBar === 0) chord.forEach((n, i) => this.keys(midi(n), t + i * 0.012, 2.6, 0.07));
    if (inBar === 10 && Math.random() < 0.6) chord.slice(1).forEach((n) => this.keys(midi(n + 12), t, 1.2, 0.035));
    if (inBar === 0 || inBar === 8 || (inBar === 11 && Math.random() < 0.4)) this.bass(midi(BASS[bar]!), t);
    if (inBar === 0 || inBar === 8) this.kick(t);
    if (inBar === 4 || inBar === 12) this.brush(t);
    if (inBar % 2 === 0) this.hat(t, inBar % 4 === 2 ? 0.022 : 0.012);
    if (inBar % 4 === 2 && Math.random() < 0.22) this.bell(midi(MELODY[Math.floor(Math.random() * MELODY.length)]!), t);
  }
  private keys(freq: number, t: number, length: number, gain: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.02);
    env.gain.exponentialRampToValueAtTime(gain * 0.35, t + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1700;
    env.connect(filter).connect(this.bus!);
    for (const [type, detune, level] of [["sine", -4, 1], ["triangle", 5, 0.35]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      g.gain.value = level;
      osc.connect(g).connect(env);
      osc.start(t);
      osc.stop(t + length + 0.05);
    }
  }
  private bass(freq: number, t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(env).connect(this.bus!);
    osc.start(t);
    osc.stop(t + 1);
  }
  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    env.gain.setValueAtTime(0.22, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(env).connect(this.bus!);
    osc.start(t);
    osc.stop(t + 0.4);
  }
  private noiseHit(t: number, type: BiquadFilterType, freq: number, gain: number, length: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(env).connect(this.bus!);
    src.start(t, Math.random() * 1.5);
    src.stop(t + length + 0.02);
  }
  private brush(t: number) {
    this.noiseHit(t, "bandpass", 1800, 0.07, 0.22);
  }
  private hat(t: number, gain: number) {
    this.noiseHit(t, "highpass", 7000, gain, 0.05);
  }
  private bell(freq: number, t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.03, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(env).connect(this.bus!);
    osc.start(t);
    osc.stop(t + 1.7);
  }
  /** Quiet vinyl and room hiss under everything. */
  private startVinyl() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(filter).connect(g).connect(this.bus!);
    src.start();
    this.vinyl = src;
  }
}

export const music = new Music();

/* ------------------------------ Voices ------------------------------ */

type Voice = { pitch: number; rate: number; female: boolean };
const VOICES: Record<string, Voice> = {
  marta: { pitch: 0.95, rate: 0.98, female: true },
  nika: { pitch: 1.12, rate: 1.05, female: true },
  bro: { pitch: 0.75, rate: 1.0, female: false },
  lev: { pitch: 0.95, rate: 0.95, female: false },
  bug: { pitch: 0.6, rate: 0.9, female: false }
};

let clips: Set<string> | null = null;
let clipsLoading: Promise<Set<string>> | null = null;
function loadClips() {
  clipsLoading ??= fetch("/voice/html/index.json")
    .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
    .then((ids) => (clips = new Set(ids)))
    .catch(() => (clips = new Set()));
  return clipsLoading;
}

function pickVoice(female: boolean): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const russian = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ru"));
  const femaleNames = /milena|irina|svetlana|dariya|alena|anna|katya|google|female|женск/i;
  const maleNames = /yuri|pavel|dmitr|maxim|male|мужск/i;
  const ranked = russian.filter((v) => (female ? femaleNames.test(v.name) && !maleNames.test(v.name) : maleNames.test(v.name)));
  return ranked.find((v) => /premium|enhanced|natural|neural|google/i.test(v.name)) ?? ranked[0] ?? russian[0] ?? null;
}

let current: { cancel: () => void } | null = null;

export function stopSpeech() {
  current?.cancel();
  current = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  music.duck(false);
}

/** Says one line in the character's voice. Resolves when it ends or is interrupted. */
export async function speak(who: string, text: string): Promise<void> {
  stopSpeech();
  const s = getSoundSettings();
  const voice = VOICES[who];
  if (!voice) return;
  const id = lineId(who, text);
  const available = clips ?? (await loadClips());
  music.duck(true);
  try {
    if (available.has(id)) {
      await new Promise<void>((resolve) => {
        const audio = new Audio(`/voice/html/${id}.mp3`);
        audio.volume = s.voiceVolume;
        audio.playbackRate = s.rate;
        audio.onended = audio.onerror = () => resolve();
        current = { cancel: () => { audio.pause(); resolve(); } };
        audio.play().catch(() => resolve());
      });
      return;
    }
    if (typeof speechSynthesis === "undefined") return;
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(spokenText(text));
      utterance.lang = "ru-RU";
      const chosen = pickVoice(voice.female);
      if (chosen) utterance.voice = chosen;
      utterance.pitch = voice.pitch;
      utterance.rate = voice.rate * s.rate;
      utterance.volume = s.voiceVolume;
      utterance.onend = utterance.onerror = () => resolve();
      current = { cancel: () => resolve() };
      speechSynthesis.speak(utterance);
    });
  } finally {
    music.duck(false);
  }
}

/** Voices load asynchronously in some browsers; warm them up early. */
export function warmUpVoices() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  void loadClips();
}
