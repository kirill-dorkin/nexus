"use client";

import { useState } from "react";
import { Button } from "@platform/ui";
import styles from "./learning.module.css";

export function CodeSnippet({ code, language }: { code: string; language?: string | undefined }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
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
        <Button variant="ghost" size="sm" disabled={pending} onClick={copy}>Скопировать код</Button>
      </figcaption>
      <pre tabIndex={0} aria-label="Пример кода, прокручиваемая область"><code>{code}</code></pre>
      {status ? <p role="status">{status}</p> : null}
    </figure>
  );
}
