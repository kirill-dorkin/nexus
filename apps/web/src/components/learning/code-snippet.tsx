"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowCounterClockwiseIcon, CheckIcon, CopyIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@platform/ui";
import { highlight, type Token } from "./code-highlight";
import { useSqlRun } from "./sql/sql-client";
import { SqlOutput } from "./sql/sql-output";
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
  html: "HTML", css: "CSS", js: "JavaScript", javascript: "JavaScript", json: "JSON", sql: "SQL", text: "Текст"
};

/** Result of an SQL example being edited: runs on a fresh teaching database (sql/, ADR-0065). */
function SqlResult({ code }: { code: string }) {
  const id = useId();
  const sql = useSqlRun({ code }, `${id}:snippet`);
  return <SqlOutput run={sql.run} busy={sql.busy} />;
}

/** Editable code with live highlighting: a transparent textarea over a highlighted layer. */
export function CodeEditor({ value, onChange, autoFocus = true, language = "html", label = "Редактор HTML. Tab — отступ, Escape и затем Tab — выйти из редактора" }: {
  value: string;
  language?: string;
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
        <code><Tokens tokens={highlight(value, language)} />{"\n"}</code>
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
  const lang = language?.toLowerCase();
  const runnable = lang === "html" || lang === "sql";
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
              <ArrowCounterClockwiseIcon size={16} aria-hidden="true" /> Сбросить
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Скопировать код">
            <CopyIcon size={16} aria-hidden="true" /> <span className={styles.hideNarrow}>Скопировать</span>
          </Button>
          {runnable && !editing ? (
            <Button size="sm" onClick={() => { setPreview(value); setEditing(true); }}>
              <PlayIcon size={14} weight="fill" aria-hidden="true" /> Попробовать
            </Button>
          ) : null}
          {editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              <CheckIcon size={16} aria-hidden="true" /> Готово
            </Button>
          ) : null}
        </span>
      </figcaption>
      {editing ? (
        <>
          <CodeEditor value={value} onChange={setValue} language={lang === "sql" ? "sql" : "html"}
            {...(lang === "sql" ? { label: "Редактор SQL. Tab — отступ, Escape и затем Tab — выйти из редактора" } : {})} />
          <section className={styles.result} aria-label="Результат кода">
            <div className={styles.resultBar}>
              <span>Результат</span>
              <span className={styles.live}><span aria-hidden="true" /> обновляется при вводе</span>
            </div>
            {lang === "sql" ? <SqlResult code={preview} /> : (
              <div className={styles.frameWrap}>
                <iframe
                  className={styles.frame}
                  title="Результат вашего HTML"
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={preview}
                />
              </div>
            )}
          </section>
        </>
      ) : (
        <pre className={styles.code} tabIndex={0} role="region" aria-label="Пример кода, прокручиваемая область">
          <code><Tokens tokens={highlight(value, language)} /></code>
        </pre>
      )}
      {copied ? <p className={styles.status} role="status">{copied}</p> : null}
    </figure>
  );
}
