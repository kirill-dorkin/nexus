"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@platform/brand";
import { Sparkle, X } from "@phosphor-icons/react/dist/ssr";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { useViewer } from "../../lib/use-viewer";
import styles from "./signup-nudge.module.css";

/*
 * A gentle invitation to create an account for anonymous learners.
 * - Counts only active study time: the tab is visible and the learner did something in the last minute.
 * - First appears after 5 active minutes; "Позже" postpones it by 15 more; at most 3 times a day.
 * - Never steals focus and waits while the learner is typing in an editor or a field.
 * All state is a per-viewer convenience in localStorage; without storage it simply shows less.
 */

const FIRST_AT = 5 * 60;
const SNOOZE = 15 * 60;
const MAX_PER_DAY = 3;
const KEY = `${brand.slug}:signup-nudge`;

type Saved = { day: string; seconds: number; nextAt: number; shown: number };

const today = () => new Date().toISOString().slice(0, 10);
function read(): Saved {
  const fresh = { day: today(), seconds: 0, nextAt: FIRST_AT, shown: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    return saved && saved.day === fresh.day ? saved : fresh;
  } catch {
    return fresh;
  }
}
function write(value: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}
function solvedChallenges() {
  try {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${brand.slug}:challenge:`) && localStorage.getItem(key) === "1") count++;
    }
    return count;
  } catch {
    return 0;
  }
}
function typing() {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || (el instanceof HTMLElement && el.isContentEditable);
}
function tasks(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "задание" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "задания" : "заданий";
  return `${n} ${word}`;
}

export function SignupNudge({ returnTo }: { returnTo: string }) {
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const lastActive = useRef(Date.now());

  useEffect(() => {
    if (viewer !== "anonymous") return;
    const mark = () => { lastActive.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastActive.current > 60_000) return;
      const state = read();
      state.seconds += 5;
      if (!open && state.shown < MAX_PER_DAY && state.seconds >= state.nextAt && !typing()) {
        const solved = solvedChallenges();
        const minutes = Math.round(state.seconds / 60);
        setMessage(solved > 0
          ? `У тебя уже ${tasks(solved).replace(/задани(е|я|й)/, (w) => ({ "задание": "решённое задание", "задания": "решённых задания", "заданий": "решённых заданий" } as Record<string, string>)[w]!)}. Создай аккаунт — прогресс сохранится, а курс останется бесплатным.`
          : `Ты учишься уже ${minutes} мин. Создай аккаунт — прогресс сохранится, а курс останется бесплатным.`);
        state.shown += 1;
        state.nextAt = state.seconds + SNOOZE;
        setOpen(true);
      }
      write(state);
    }, 5000);
    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, mark);
    };
  }, [viewer, open]);

  if (viewer !== "anonymous" || !open) return null;
  return (
    <aside className={styles.nudge} aria-label="Сохранить прогресс" style={{ "--c": "#c5f23a" } as CSSProperties}>
      <button type="button" className={styles.close} aria-label="Закрыть" onClick={() => setOpen(false)}>
        <X size={16} aria-hidden="true" />
      </button>
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true"><Sparkle size={18} weight="fill" /></span>
        <strong>Ника</strong>
      </div>
      <p role="status">{message}</p>
      <div className={styles.actions}>
        <Link className={styles.primary} href={`${learningLoginUrl(returnTo)}&mode=register`}>Создать аккаунт</Link>
        <button type="button" className={styles.later} onClick={() => setOpen(false)}>Позже</button>
      </div>
    </aside>
  );
}

/** Quiet one-liner under a solved challenge for anonymous learners. */
export function SaveProgressHint() {
  const viewer = useViewer();
  const returnTo = usePathname() ?? "/me/learning";
  if (viewer !== "anonymous") return null;
  return (
    <p className={styles.hint}>
      Решения хранятся только в этом браузере. <Link href={`${learningLoginUrl(returnTo)}&mode=register`}>Создай аккаунт</Link>, чтобы не потерять прогресс.
    </p>
  );
}
