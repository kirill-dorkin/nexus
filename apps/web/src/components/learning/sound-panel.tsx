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
  const { settings: s, unlocked } = useSoundState();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const on = s.music;

  // Sound is on by default but browsers allow audio only after a gesture: the first click,
  // tap or key press anywhere on the page starts it.
  useEffect(() => {
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const unlock = () => {
      unlockSound();
      for (const e of events) window.removeEventListener(e, unlock);
    };
    for (const e of events) window.addEventListener(e, unlock, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, unlock);
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
        aria-label={on && !unlocked ? "Включить музыку" : "Музыка"}
        data-waiting={on && !unlocked || undefined}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        {on ? <SpeakerHigh size={16} weight="fill" aria-hidden="true" /> : <SpeakerSlash size={16} aria-hidden="true" />}
        <span className={styles.label}>{on && !unlocked ? "Включить музыку" : "Музыка"}</span>
        {s.music && unlocked ? <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span> : null}
      </button>
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Музыка">
          <section className={styles.group}>
            <label className={styles.switchRow}>
              <span className={styles.icon} aria-hidden="true"><MusicNotes size={18} weight="fill" /></span>
              <span className={styles.text}>
                <strong>Музыка «Кофейня»</strong>
                <span>Тихий лоу-фай на фоне: аккорды, бас и шум винила</span>
              </span>
              <input type="checkbox" role="switch" checked={s.music} onChange={(e) => updateSound({ music: e.target.checked })} />
            </label>
            <div className={styles.controls} data-disabled={!s.music || undefined}>
              <label>
                Громкость
                <input type="range" min={0} max={1} step={0.05} value={s.musicVolume} disabled={!s.music}
                  onChange={(e) => updateSound({ musicVolume: Number(e.target.value) })} />
              </label>
            </div>
          </section>
          <p className={styles.note}>Музыка генерируется прямо на странице и не прерывается при переходе между уроками.</p>
        </div>
      ) : null}
    </div>
  );
}
