"use client";

import { useState } from "react";
import { Button } from "@platform/ui";
import { HtmlPlayground } from "./html-playground";
import styles from "./learning.module.css";

export function CodeSnippet({ code, language }: { code: string; language?: string | undefined }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const runnable = language?.toLowerCase() === "html";
  async function copy() {
    setPending(true);
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Код скопирован");
    } catch {
      setStatus("Не удалось скопировать. Выделите код и скопируйте вручную.");
    } finally {
      setPending(false);
    }
  }
  return (
    <figure className={styles.codeSnippet}>
      <figcaption>
        <span>{language ?? "Пример кода"}</span>
        <span className={styles.codeActions}>
          {runnable && !playing ? (
            <Button size="sm" onClick={() => setPlaying(true)}>
              Попробовать
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" disabled={pending} onClick={copy}>Скопировать код</Button>
        </span>
      </figcaption>
      {playing ? (
        <HtmlPlayground initial={code} onClose={() => setPlaying(false)} />
      ) : (
        <pre tabIndex={0} aria-label="Пример кода, прокручиваемая область"><code>{code}</code></pre>
      )}
      {status ? <p role="status">{status}</p> : null}
    </figure>
  );
}
