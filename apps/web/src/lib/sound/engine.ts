"use client";

import { brand } from "@platform/brand";
import { Band } from "./band";
import { nextBarAfter } from "./timeline";

/*
 * Lesson music: generative "coffee shop" lo-fi in Web Audio — no files, no licences.
 * composer.ts decides the notes, band.ts makes the sound, this module runs it in the page:
 *   - settings (on/off, volume) persist and stay in sync across tabs;
 *   - browsers allow audio only after a real gesture, so playback starts on the first click,
 *     tap or key press, and keeps trying until the browser actually lets it run;
 *   - a worker clock keeps time in background tabs, where page timers are throttled, and a
 *     late clock skips ahead instead of firing a pile of missed notes at once;
 *   - only one tab plays: the one the learner last interacted with;
 *   - start and stop fade, and a stopped context is suspended to save battery.
 * A module singleton, so it keeps playing across client-side navigation.
 */

export type SoundSettings = { music: boolean; musicVolume: number };
export type SoundState = { settings: SoundSettings; unlocked: boolean; elsewhere: boolean };

// On by default; playback still waits for the first gesture.
const DEFAULTS: SoundSettings = { music: true, musicVolume: 0.3 };
// v2: the old key stored "off" as the former default, which would hide the new default.
const KEY = `${brand.slug}:sound:v2`;

let settings: SoundSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

function read(): SoundSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SoundSettings>;
    const volume = typeof saved.musicVolume === "number" && saved.musicVolume >= 0 && saved.musicVolume <= 1 ? saved.musicVolume : DEFAULTS.musicVolume;
    return { music: typeof saved.music === "boolean" ? saved.music : DEFAULTS.music, musicVolume: volume };
  } catch {
    return DEFAULTS;
  }
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  settings = read();
  // Another tab changed the settings: follow them.
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    settings = read();
    music.apply();
    notify();
  });
}
export function getSoundSettings(): SoundSettings {
  load();
  return settings;
}
export const getServerSoundSettings = (): SoundSettings => DEFAULTS;
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

let unlocked = false;
export const isSoundUnlocked = () => unlocked;
/**
 * Call from a user gesture (click, key press, tap). The first one unlocks audio; every later one
 * also makes this tab the one that plays, if music is on.
 */
export function unlockSound() {
  load();
  const first = !unlocked;
  unlocked = true;
  music.claim();
  music.apply();
  if (first) notify();
}

let snapshot: SoundState = { settings: DEFAULTS, unlocked: false, elsewhere: false };
/** Settings, unlock and tab state as one stable snapshot for useSyncExternalStore. */
export function getSoundState(): SoundState {
  const current = getSoundSettings();
  const elsewhere = music.elsewhere;
  if (snapshot.settings !== current || snapshot.unlocked !== unlocked || snapshot.elsewhere !== elsewhere) {
    snapshot = { settings: current, unlocked, elsewhere };
  }
  return snapshot;
}
const serverState: SoundState = { settings: DEFAULTS, unlocked: false, elsewhere: false };
export const getServerSoundState = () => serverState;

export function updateSound(patch: Partial<SoundSettings>) {
  load();
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this page only */
  }
  if (patch.music) music.claim();
  music.apply();
  notify();
}

/** A perceptual curve: the slider's middle sounds like half volume; full stays below clipping. */
export const volumeGain = (volume: number) => 0.9 * volume ** 1.6;

/* ------------------------------ Player ------------------------------ */

const LOOKAHEAD = 0.25; // seconds of music scheduled ahead while the tab is visible
const BACKGROUND_LOOKAHEAD = 1.5; // background clocks tick less often; keep more queued
const TICK_MS = 50;
const FADE_IN = 1.8;
const FADE_OUT = 0.6;

type TabMessage = { type: "claim"; tab: string };

class Player {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private band: Band | null = null;
  private clock: Worker | null = null;
  private fallbackTimer: number | null = null;
  private bar = 0;
  private nextBarTime = 0;
  private suspendTimer: number | null = null;
  private retiring: Band | null = null;
  private channel: BroadcastChannel | null = null;
  private readonly tab = Math.random().toString(36).slice(2);
  private readonly seed = Math.floor(Math.random() * 2 ** 31);
  private playing = false;
  /** Another tab took over the music; this one waits for the learner to come back. */
  elsewhere = false;

  /** This tab becomes the one that plays; the others fall silent. */
  claim() {
    if (!getSoundSettings().music) return;
    const wasElsewhere = this.elsewhere;
    this.elsewhere = false;
    this.tabs()?.postMessage({ type: "claim", tab: this.tab } satisfies TabMessage);
    if (wasElsewhere) notify();
  }

  /** Follows the settings and the tab state: starts, stops or changes volume. */
  apply() {
    if (!unlocked) return;
    const s = getSoundSettings();
    if (s.music && !this.elsewhere) void this.start();
    else this.stop();
    this.level(FADE_IN / 4);
  }

  private tabs() {
    if (this.channel || typeof BroadcastChannel === "undefined") return this.channel;
    this.channel = new BroadcastChannel(`${brand.slug}:music`);
    this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
      if (event.data?.type !== "claim" || event.data.tab === this.tab) return;
      if (!this.elsewhere) {
        this.elsewhere = true;
        this.stop();
        notify();
      }
    };
    return this.channel;
  }

  private setup(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    // iOS: play through the "playback" session, so the silent switch does not mute the music.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) try { session.type = "playback"; } catch { /* unsupported */ }
    const ctx = new Context({ latencyHint: "playback" });
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.tabs();
    return ctx;
  }

  private level(timeConstant: number) {
    if (!this.ctx || !this.master) return;
    const s = getSoundSettings();
    const target = s.music && this.playing ? volumeGain(s.musicVolume) : 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.setTargetAtTime(target, now, timeConstant);
  }

  private async start() {
    const ctx = this.setup();
    if (!ctx || !this.master) return;
    if (this.suspendTimer !== null) window.clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
    this.retire();
    // resume() must be called inside the gesture; it may still be refused (then the next gesture retries).
    if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
    if (this.playing) return;
    this.playing = true;
    // A fresh band each time: the song starts from its intro, and stale sources are gone.
    this.band = new Band(ctx, this.seed);
    this.band.output.connect(this.master);
    this.bar = 0;
    this.nextBarTime = ctx.currentTime + 0.15;
    this.level(FADE_IN / 4);
    this.startClock();
    this.tick();
  }

  private stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    this.stopClock();
    this.level(FADE_OUT / 4);
    const ctx = this.ctx;
    this.retiring = this.band;
    this.band = null;
    // After the fade: release the sources and let the device sleep.
    this.suspendTimer = window.setTimeout(() => {
      this.suspendTimer = null;
      this.retire();
      if (!this.playing) void ctx.suspend().catch(() => undefined);
    }, (FADE_OUT + 0.6) * 1000);
  }

  /** Releases the band of the previous playback (its loops and anything still scheduled). */
  private retire() {
    if (!this.retiring || !this.ctx) return;
    this.retiring.stop(this.ctx.currentTime);
    this.retiring.output.disconnect();
    this.retiring = null;
  }

  private tick() {
    const ctx = this.ctx;
    const band = this.band;
    if (!ctx || !band || !this.playing || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const ahead = document.hidden ? BACKGROUND_LOOKAHEAD : LOOKAHEAD;
    // The clock fell behind (a sleeping laptop, a frozen tab): skip to the next bar rather
    // than playing every missed note at once.
    const resumed = nextBarAfter(this.bar, this.nextBarTime, now, Band.barSeconds());
    this.bar = resumed.bar;
    this.nextBarTime = resumed.time;
    while (this.nextBarTime < now + ahead) {
      band.playBar(this.bar, this.nextBarTime);
      this.bar += 1;
      this.nextBarTime += Band.barSeconds();
    }
  }

  /** A worker's timer is not throttled in background tabs the way page timers are. */
  private startClock() {
    if (this.clock || this.fallbackTimer !== null) return;
    try {
      const source = "let t;onmessage=e=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}";
      this.clock = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
      this.clock.onmessage = () => this.tick();
      this.clock.postMessage(TICK_MS);
    } catch {
      this.fallbackTimer = window.setInterval(() => this.tick(), TICK_MS);
    }
  }

  private stopClock() {
    this.clock?.postMessage(0);
    this.clock?.terminate();
    this.clock = null;
    if (this.fallbackTimer !== null) window.clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
  }
}

export const music = new Player();
