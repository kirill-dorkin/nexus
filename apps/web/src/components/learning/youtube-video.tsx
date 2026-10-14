"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@platform/ui";
import styles from "./youtube-video.module.css";

/** A canonical ID is the only media locator. No third-party request before consent. */
export function YouTubeVideo({
  videoId,
  title,
  source
}: {
  videoId: string;
  title: string;
  source?: string;
}) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const play = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (active) {
      opened.current = true;
      close.current?.focus({ preventScroll: true });
    } else if (opened.current) {
      play.current?.focus({ preventScroll: true });
    }
  }, [active]);
  return (
    <section className={styles.video} aria-label="Видео урока">
      <div
        className={`${styles.frame} ${active ? styles.frameActive : ""}`}
      >
        {active ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={`Видео: ${title}`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.glow} aria-hidden="true" />
            <div className={styles.posterContent}>
              <span className={styles.eyebrow}>
                {source ? `ОТКРЫТОЕ ВИДЕО · ${source}` : "ВИДЕО УРОКА · YOUTUBE"}
              </span>
              <strong>{title}</strong>
              <p>
                {source
                  ? "Внешний учебный материал. Плеер загрузится только после вашего нажатия."
                  : "Сначала посмотрите объяснение, затем переходите к конспекту."}
              </p>
            </div>
            <Button className={styles.play} ref={play} onClick={() => { setLoaded(false); setActive(true); }}>
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" /></svg> Смотреть видео
            </Button>
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <p role="status" aria-live="polite">
          {active
            ? loaded
              ? "Видео загружено. Если плеер недоступен, откройте ролик отдельно."
              : "Загружаем плеер YouTube…"
            : "YouTube не загружается до нажатия. Если встраивание недоступно, откройте видео отдельно."}
        </p>
        <div className={styles.actions}>
          {active ? <Button ref={close} variant="ghost" size="sm" onClick={() => setActive(false)}>Закрыть плеер</Button> : null}
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Открыть на YouTube <span aria-hidden="true">↗</span><span className={styles.srOnly}> (новая вкладка)</span></a>
        </div>
      </div>
    </section>
  );
}

