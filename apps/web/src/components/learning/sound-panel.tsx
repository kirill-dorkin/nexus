"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MusicNotes, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react/dist/ssr";
import {
  getServerSoundState, getSoundState, subscribeSound, unlockSound, updateSound
} from "../../lib/sound/engine";
import styles from "./sound-panel.module.css";

export function useSoundState() {
  return useSyncExternalStore(subscribeSound, getSoundState, getServerSoundState);
}

/** "Музыка" control in the site header: generative coffee-shop music on every page, on by default. */
export function SoundPanel({ compact = false }: { compact?: boolean }) {
  const { settings: s, unlocked, elsewhere } = useSoundState();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const on = s.music;

  // Browsers allow audio only after a real gesture. These events count as one everywhere
  // (touchstart does not); every later gesture also makes this tab the one that plays.
  useEffect(() => {
    const events = ["pointerdown", "pointerup", "keydown", "touchend", "click"] as const;
    const gesture = (event: Event) => {
      if (event instanceof KeyboardEvent && (event.key === "Escape" || event.repeat)) return;
      unlockSound();
    };
    for (const e of events) window.addEventListener(e, gesture, { passive: true, capture: true });
    return () => {
      for (const e of events) window.removeEventListener(e, gesture, { capture: true });
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.root}>
      <button type="button" className={styles.trigger} data-sound-trigger="" data-compact={compact || undefined} data-on={on || undefined}
        aria-label={on && !unlocked ? "Включить музыку" : on && elsewhere ? "Музыка играет в другой вкладке" : "Музыка"}
        title={on && elsewhere ? "Музыка играет в другой вкладке. Нажмите, чтобы слушать здесь" : undefined}
        data-waiting={on && !unlocked || undefined}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        {on ? <SpeakerHigh size={16} weight="fill" aria-hidden="true" /> : <SpeakerSlash size={16} aria-hidden="true" />}
        <span className={styles.label}>{on && !unlocked ? "Включить музыку" : "Музыка"}</span>
        {s.music && unlocked && !elsewhere ? <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span> : null}
      </button>
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Музыка">
          <section className={styles.group}>
            <label className={styles.switchRow}>
              <span className={styles.icon} aria-hidden="true"><MusicNotes size={18} weight="fill" /></span>
              <span className={styles.text}>
                <strong>Музыка «Кофейня»</strong>
                <span>Тихий лоу-фай: электропиано, бас, мягкие барабаны и винил</span>
              </span>
              <input type="checkbox" role="switch" checked={s.music} onChange={(e) => updateSound({ music: e.target.checked })} />
            </label>
            <div className={styles.controls} data-disabled={!s.music || undefined}>
              <label>
                <span className={styles.volumeHead}>Громкость <output>{Math.round(s.musicVolume * 100)}%</output></span>
                <input type="range" min={0} max={1} step={0.05} value={s.musicVolume} disabled={!s.music}
                  aria-valuetext={`${Math.round(s.musicVolume * 100)}%`}
                  onChange={(e) => updateSound({ musicVolume: Number(e.target.value) })} />
              </label>
            </div>
          </section>
          <p className={styles.note}>Музыка сочиняется прямо на странице и не повторяется: каждые восемь тактов меняются аккорды и мелодия. Не прерывается при переходе между уроками и играет в той вкладке, где вы сейчас.</p>
        </div>
      ) : null}
    </div>
  );
}
