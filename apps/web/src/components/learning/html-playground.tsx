"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@platform/ui";
import styles from "./html-playground.module.css";

/**
 * Learner-local HTML sandbox. Nothing leaves the browser: the preview is an
 * opaque-origin iframe with every sandbox restriction (no scripts, forms,
 * popups or top navigation), so learner markup cannot reach the page.
 */
export function HtmlPlayground({ initial, onClose }: { initial: string; onClose: () => void }) {
  const id = useId();
  const [code, setCode] = useState(initial);
  const [preview, setPreview] = useState(initial);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(code), 250);
    return () => window.clearTimeout(timer);
  }, [code]);
  return (
    <div className={styles.playground}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <label htmlFor={`${id}-editor`}>Ваш код</label>
          <div className={styles.paneActions}>
            <Button
              variant="ghost"
              size="sm"
              disabled={code === initial}
              onClick={() => setCode(initial)}
            >
              Вернуть пример
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Закрыть песочницу
            </Button>
          </div>
        </div>
        <textarea
          id={`${id}-editor`}
          className={styles.editor}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <span>Результат</span>
          <span className={styles.live} aria-hidden="true">обновляется сам</span>
        </div>
        <iframe
          className={styles.preview}
          title="Результат вашего HTML"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={preview}
        />
      </div>
    </div>
  );
}
