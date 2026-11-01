"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Headphones, MusicNotes, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react/dist/ssr";
import {
  getServerSoundSettings, getSoundSettings, music, subscribeSound, updateSound, warmUpVoices
} from "../../lib/sound/engine";
import styles from "./sound-panel.module.css";

export function useSoundSettings() {
  return useSyncExternalStore(subscribeSound, getSoundSettings, getServerSoundSettings);
}

const RATES = [0.9, 1, 1.15, 1.3];

/** Compact "Звук" control on lesson pages: character voices and coffee-shop music, both opt-in. */
export function SoundPanel() {
  const s = useSoundSettings();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const on = s.music || s.voice;

  // A saved "music on" can only start after the first gesture on this page (browser autoplay rules).
  useEffect(() => {
    warmUpVoices();
    if (!getSoundSettings().music) return;
    const resume = () => music.apply();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
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
      <button type="button" className={styles.trigger} data-sound-trigger="" data-on={on || undefined}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        {on ? <SpeakerHigh size={16} weight="fill" aria-hidden="true" /> : <SpeakerSlash size={16} aria-hidden="true" />}
        Звук
        {s.music ? <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span> : null}
      </button>
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Настройки звука">
          <section className={styles.group}>
            <label className={styles.switchRow}>
              <span className={styles.icon} aria-hidden="true"><Headphones size={18} weight="fill" /></span>
              <span className={styles.text}>
                <strong>Озвучка героев</strong>
                <span>Сцены читаются голосами, сообщения появляются в такт речи</span>
              </span>
              <input type="checkbox" role="switch" checked={s.voice} onChange={(e) => updateSound({ voice: e.target.checked })} />
            </label>
            <div className={styles.controls} data-disabled={!s.voice || undefined}>
              <label>
                Громкость
                <input type="range" min={0} max={1} step={0.05} value={s.voiceVolume} disabled={!s.voice}
                  onChange={(e) => updateSound({ voiceVolume: Number(e.target.value) })} />
              </label>
              <div className={styles.rates} role="radiogroup" aria-label="Скорость речи">
                {RATES.map((rate) => (
                  <button key={rate} type="button" role="radio" aria-checked={s.rate === rate} disabled={!s.voice}
                    onClick={() => updateSound({ rate })}>{rate}×</button>
                ))}
              </div>
            </div>
          </section>
          <section className={styles.group}>
            <label className={styles.switchRow}>
              <span className={styles.icon} aria-hidden="true"><MusicNotes size={18} weight="fill" /></span>
              <span className={styles.text}>
                <strong>Музыка «Кофейня»</strong>
                <span>Тихий лоу-фай, сам приглушается, когда говорят герои</span>
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
          <p className={styles.note}>
            Бро, Лев и Вредный Скрипт озвучены нейросинтезом, Марта и Ника — голосом вашего браузера. Музыка генерируется
            прямо на странице.
          </p>
        </div>
      ) : null}
    </div>
  );
}
