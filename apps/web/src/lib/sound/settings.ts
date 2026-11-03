import { brand } from "@platform/brand";

export type SoundSettings = { music: boolean; musicVolume: number };

// On by default; playback still waits for the first gesture.
export const DEFAULT_SOUND: SoundSettings = { music: true, musicVolume: 0.3 };
// v2: the old key stored "off" as the former default, which would hide the new default.
export const SOUND_KEY = `${brand.slug}:sound:v2`;

/** Saved settings, each value checked; anything unreadable falls back to the defaults. */
export function readSoundSettings(): SoundSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SOUND_KEY) ?? "{}"
    ) as Partial<SoundSettings>;
    const volume =
      typeof saved.musicVolume === "number" &&
      saved.musicVolume >= 0 &&
      saved.musicVolume <= 1
        ? saved.musicVolume
        : DEFAULT_SOUND.musicVolume;
    return {
      music:
        typeof saved.music === "boolean" ? saved.music : DEFAULT_SOUND.music,
      musicVolume: volume
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

export function writeSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this page only */
  }
}

/** A perceptual curve: the slider's middle sounds like half volume; full stays below clipping. */
export const volumeGain = (volume: number) => 0.9 * volume ** 1.6;
