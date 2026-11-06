"use client";

import { useEffect, useState, type RefObject } from "react";
import styles from "./code-keys.module.css";

/** One key: what it shows and what it types. `move` shifts the caret instead of typing. */
export type CodeKey = {
  label: string;
  text?: string;
  move?: -1 | 1;
  name?: string;
};

const COMMON: CodeKey[] = [
  { label: "⇥", text: "  ", name: "Отступ" },
  { label: "←", move: -1, name: "Курсор влево" },
  { label: "→", move: 1, name: "Курсор вправо" }
];

/** The characters a phone keyboard hides deepest, per language, most used first. */
export const LANGUAGE_KEYS: Record<string, CodeKey[]> = {
  html: ["<", ">", "/", "=", '"', "</", "!", "-"].map((t) => ({
    label: t,
    text: t
  })),
  css: ["{", "}", ":", ";", ".", "#", "(", ")", "%", "-"].map((t) => ({
    label: t,
    text: t
  })),
  js: [
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    ";",
    "=",
    "=>",
    '"',
    "'",
    "`",
    ".",
    "+"
  ].map((t) => ({ label: t, text: t })),
  sql: [
    ...["SELECT", "FROM", "WHERE", "ORDER BY", "JOIN"].map((t) => ({
      label: t,
      text: `${t} `
    })),
    ...["*", ",", ";", "'", "=", "(", ")", "<", ">"].map((t) => ({
      label: t,
      text: t
    }))
  ]
};

export function keysFor(language: string): CodeKey[] {
  const own =
    LANGUAGE_KEYS[language === "javascript" ? "js" : language] ??
    LANGUAGE_KEYS.html ??
    [];
  return [...COMMON, ...own];
}

/** Types a key into the textarea at the caret, as if the learner had typed it. */
export function pressKey(
  area: HTMLTextAreaElement,
  key: CodeKey,
  onChange: (value: string) => void
) {
  if (key.move) {
    const at = Math.min(
      Math.max(area.selectionStart + key.move, 0),
      area.value.length
    );
    area.setSelectionRange(at, at);
    return;
  }
  area.setRangeText(
    key.text ?? key.label,
    area.selectionStart,
    area.selectionEnd,
    "end"
  );
  onChange(area.value);
}

const touchDevice = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * A bar of code characters above the phone keyboard (a site cannot replace the system
 * keyboard). Shown only on touch screens while the editor has focus; pressing a key keeps
 * the focus, so the keyboard stays open.
 */
export function CodeKeys({
  target,
  language,
  visible,
  onChange
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  language: string;
  visible: boolean;
  onChange: (value: string) => void;
}) {
  const [bottom, setBottom] = useState(0);
  const [touch] = useState(touchDevice);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!visible || !touch || !viewport) return;
    // The keyboard shrinks the visual viewport: sit right on top of it.
    const place = () =>
      setBottom(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      );
    place();
    viewport.addEventListener("resize", place);
    viewport.addEventListener("scroll", place);
    return () => {
      viewport.removeEventListener("resize", place);
      viewport.removeEventListener("scroll", place);
    };
  }, [visible, touch]);

  if (!visible || !touch) return null;
  return (
    <div
      className={styles.bar}
      role="toolbar"
      aria-label="Символы кода"
      style={{ bottom }}
    >
      {keysFor(language).map((key) => (
        <button
          key={key.label}
          type="button"
          className={styles.key}
          aria-label={key.name ?? key.label}
          // Keep the focus (and the keyboard) in the editor.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            const area = target.current;
            if (area) pressKey(area, key, onChange);
          }}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
