// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SOUND,
  readSoundSettings,
  SOUND_KEY,
  writeSoundSettings
} from "./settings";

beforeEach(() => {
  localStorage.clear();
});

describe("sound settings", () => {
  it("starts with music on at a moderate volume", () => {
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND);
  });

  it("round-trips saved settings", () => {
    writeSoundSettings({ music: false, musicVolume: 0.8 });
    expect(readSoundSettings()).toEqual({ music: false, musicVolume: 0.8 });
  });

  it("replaces invalid or unreadable values with the defaults", () => {
    localStorage.setItem(
      SOUND_KEY,
      JSON.stringify({ music: "yes", musicVolume: 7 })
    );
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND);
    localStorage.setItem(SOUND_KEY, "{broken");
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND);
  });
});
