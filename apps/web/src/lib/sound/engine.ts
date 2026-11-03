"use client";

import { brand } from "@platform/brand";
import { Band } from "./band";
import { TickClock } from "./clock";
import {
  DEFAULT_SOUND,
  readSoundSettings,
  SOUND_KEY,
  volumeGain,
  writeSoundSettings,
  type SoundSettings
} from "./settings";
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

export type { SoundSettings } from "./settings";
export { volumeGain };

export type SoundState = {
  settings: SoundSettings;
  unlocked: boolean;
  elsewhere: boolean;
};

let settings: SoundSettings = DEFAULT_SOUND;
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  settings = readSoundSettings();
  // Another tab changed the settings: follow them.
  window.addEventListener("storage", (event) => {
    if (event.key !== SOUND_KEY) return;
    settings = readSoundSettings();
    music.apply();
    notify();
  });
}
export function getSoundSettings(): SoundSettings {
  load();
  return settings;
}
export const getServerSoundSettings = (): SoundSettings => DEFAULT_SOUND;
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

const serverState: SoundState = {
  settings: DEFAULT_SOUND,
  unlocked: false,
  elsewhere: false
};
let snapshot = serverState;
/** Settings, unlock and tab state as one stable snapshot for useSyncExternalStore. */
export function getSoundState(): SoundState {
  const current = getSoundSettings();
  const elsewhere = music.elsewhere;
  if (
    snapshot.settings !== current ||
    snapshot.unlocked !== unlocked ||
    snapshot.elsewhere !== elsewhere
  ) {
    snapshot = { settings: current, unlocked, elsewhere };
  }
  return snapshot;
}
export const getServerSoundState = () => serverState;

export function updateSound(patch: Partial<SoundSettings>) {
  load();
  settings = { ...settings, ...patch };
  writeSoundSettings(settings);
  if (patch.music) music.claim();
  music.apply();
  notify();
}

// A whole bar (≈3.2 s) is always queued ahead: page work — opening a heavy course page,
// running a lesson's code — can block the main thread for a moment without the music noticing.
const LOOKAHEAD_MARGIN = 0.5;
const TICK_MS = 100;
const FADE_IN = 1.8;
const FADE_OUT = 0.6;

type TabMessage = { type: "claim"; tab: string };

class Player {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private band: Band | null = null;
  private readonly clock = new TickClock(TICK_MS, () => this.tick());
  private bar = 0;
  private nextBarTime = 0;
  private suspendTimer: number | null = null;
  private retiring: Band | null = null;
  private target = -1;
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
    this.tabs()?.postMessage({
      type: "claim",
      tab: this.tab
    } satisfies TabMessage);
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
    if (this.channel || typeof BroadcastChannel === "undefined")
      return this.channel;
    this.channel = new BroadcastChannel(`${brand.slug}:music`);
    // Another tab may run an older build, so its message is checked, not trusted.
    this.channel.onmessage = (
      event: MessageEvent<Partial<TabMessage> | null>
    ) => {
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
    // Older Safari exposes only the prefixed constructor.
    const audioWindow = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!Context) return null;
    // iOS: play through the "playback" session, so the silent switch does not mute the music.
    const session = (
      navigator as unknown as { audioSession?: { type: string } }
    ).audioSession;
    if (session)
      try {
        session.type = "playback";
      } catch {
        /* unsupported */
      }
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
    // Clicks and navigation call apply() all the time; touch the gain only when it really changes,
    // so an ongoing fade is never restarted (some browsers would drop the level to its old value).
    if (target === this.target) return;
    this.target = target;
    const now = this.ctx.currentTime;
    const gain = this.master.gain;
    // Hold the level reached so far, then glide to the new one: no jumps mid-fade.
    if (typeof gain.cancelAndHoldAtTime === "function")
      gain.cancelAndHoldAtTime(now);
    else {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
    }
    gain.setTargetAtTime(target, now, timeConstant);
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
    this.clock.start();
    this.tick();
  }

  private stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    this.clock.stop();
    this.level(FADE_OUT / 4);
    const ctx = this.ctx;
    this.retiring = this.band;
    this.band = null;
    // After the fade: release the sources and let the device sleep.
    this.suspendTimer = window.setTimeout(
      () => {
        this.suspendTimer = null;
        this.retire();
        if (!this.playing) void ctx.suspend().catch(() => undefined);
      },
      (FADE_OUT + 0.6) * 1000
    );
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
    const ahead = Band.barSeconds() + LOOKAHEAD_MARGIN;
    // The clock fell behind (a sleeping laptop, a frozen tab): skip to the next bar rather
    // than playing every missed note at once.
    const resumed = nextBarAfter(
      this.bar,
      this.nextBarTime,
      now,
      Band.barSeconds()
    );
    this.bar = resumed.bar;
    this.nextBarTime = resumed.time;
    while (this.nextBarTime < now + ahead) {
      band.playBar(this.bar, this.nextBarTime);
      this.bar += 1;
      this.nextBarTime += Band.barSeconds();
    }
  }
}

export const music = new Player();
