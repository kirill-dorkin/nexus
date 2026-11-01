"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowCounterClockwise, Check, Copy, Play } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@platform/ui";
import { highlight, type Token } from "./code-highlight";
import styles from "./code.module.css";

function Tokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((token, index) =>
        token.kind === "plain" ? token.text : (
          <span key={index} className={styles[token.kind]}>{token.text}</span>
        )
      )}
    </>
  );
}

const LANGUAGE_NAMES: Record<string, string> = {
  html: "HTML", css: "CSS", js: "JavaScript", javascript: "JavaScript", json: "JSON", text: "Текст"
};

/** Editable code with live highlighting: a transparent textarea over a highlighted layer. */
export function CodeEditor({ value, onChange, autoFocus = true, label = "Редактор HTML. Tab — отступ, Escape и затем Tab — выйти из редактора" }: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  const layer = useRef<HTMLPreElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const releaseTab = useRef(false);
  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const rows = Math.min(Math.max(value.split("\n").length + 1, 4), 24);
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      releaseTab.current = true; // the next Tab leaves the editor
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && !releaseTab.current) {
      event.preventDefault();
      event.currentTarget.setRangeText("  ", event.currentTarget.selectionStart, event.currentTarget.selectionEnd, "end");
      onChange(event.currentTarget.value);
      return;
    }
    releaseTab.current = false;
  }
  return (
    <div className={styles.editor}>
      <pre ref={layer} className={styles.layer} aria-hidden="true">
        <code><Tokens tokens={highlight(value, "html")} />{"\n"}</code>
      </pre>
      <textarea
        ref={input}
        className={styles.input}
        value={value}
        rows={rows}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={keyDown}
        onScroll={(event) => {
          if (!layer.current) return;
          layer.current.scrollTop = event.currentTarget.scrollTop;
          layer.current.scrollLeft = event.currentTarget.scrollLeft;
        }}
      />
    </div>
  );
}

/**
 * Lesson code block. HTML examples can be edited in place and rendered live in an
 * opaque-origin iframe with every sandbox restriction; nothing leaves the browser.
 */
export function CodeSnippet({ code, language }: { code: string; language?: string | undefined }) {
  const runnable = language?.toLowerCase() === "html";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(code);
  const [preview, setPreview] = useState(code);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => setPreview(value), 200);
    return () => window.clearTimeout(timer);
  }, [value, editing]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("Код скопирован");
    } catch {
      setCopied("Не удалось скопировать. Выделите код и скопируйте вручную.");
    }
  }
  const name = LANGUAGE_NAMES[language?.toLowerCase() ?? ""] ?? language ?? "Пример кода";
  return (
    <figure className={`${styles.snippet} ${editing ? styles.editing : ""}`}>
      <figcaption className={styles.bar}>
        <span className={styles.lang}>
          <span className={styles.dot} aria-hidden="true" />
          {name}
          {editing ? <span className={styles.mode}>· редактирование</span> : null}
        </span>
        <span className={styles.actions}>
          {editing ? (
            <Button variant="ghost" size="sm" disabled={value === code} onClick={() => setValue(code)}>
              <ArrowCounterClockwise size={16} aria-hidden="true" /> Сбросить
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Скопировать код">
            <Copy size={16} aria-hidden="true" /> <span className={styles.hideNarrow}>Скопировать</span>
          </Button>
          {runnable && !editing ? (
            <Button size="sm" onClick={() => { setPreview(value); setEditing(true); }}>
              <Play size={14} weight="fill" aria-hidden="true" /> Попробовать
            </Button>
          ) : null}
          {editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              <Check size={16} aria-hidden="true" /> Готово
            </Button>
          ) : null}
        </span>
      </figcaption>
      {editing ? (
        <>
          <CodeEditor value={value} onChange={setValue} />
          <section className={styles.result} aria-label="Результат кода">
            <div className={styles.resultBar}>
              <span>Результат</span>
              <span className={styles.live}><span aria-hidden="true" /> обновляется при вводе</span>
            </div>
            <div className={styles.frameWrap}>
              <iframe
                className={styles.frame}
                title="Результат вашего HTML"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={preview}
              />
            </div>
          </section>
        </>
      ) : (
        <pre className={styles.code} tabIndex={0} aria-label="Пример кода, прокручиваемая область">
          <code><Tokens tokens={highlight(value, language)} /></code>
        </pre>
      )}
      {copied ? <p className={styles.status} role="status">{copied}</p> : null}
    </figure>
  );
}
