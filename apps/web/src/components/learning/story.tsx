"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Bug, Coffee, FastForward, Headphones, Robot, Sparkle, User } from "@phosphor-icons/react/dist/ssr";
import { CodeSnippet } from "./code-snippet";
import styles from "./story.module.css";

/*
 * Story course blocks authored as JSON in Markdown fences:
 *   ```story   — a short messenger scene with the course characters;
 *   ```concept — a "what it is / why / how" card for one element or attribute.
 * Everything renders as text nodes; invalid JSON falls back to a code block.
 */

export const CHARACTERS = {
  marta: { name: "Марта", role: "хозяйка кофейни «Зерно»", color: "#fdba74", Icon: Coffee },
  bro: { name: "Бро", role: "браузер", color: "#7dd3fc", Icon: Robot },
  nika: { name: "Ника", role: "наставница", color: "#c5f23a", Icon: Sparkle },
  lev: { name: "Лев", role: "гость, слушает сайты скринридером", color: "#c4b5fd", Icon: Headphones },
  bug: { name: "Вредный Скрипт", role: "злодей", color: "#fda4af", Icon: Bug },
  you: { name: "Вы", role: "", color: "#e4e4e7", Icon: User }
} as const;
export type Who = keyof typeof CHARACTERS;
type Line = { who: Who; text: string };
export type Story = { title?: string | undefined; lines: Line[] };
export type Concept = { name: string; title: string; what: string; why: string; how?: string | undefined; lang?: string | undefined; show?: number | undefined; bro?: string | undefined };

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const json = (source: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(source);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

export function parseStory(source: string): Story | null {
  const v = json(source);
  if (!v || !Array.isArray(v.lines) || v.lines.length < 1 || v.lines.length > 14) return null;
  const lines: Line[] = [];
  for (const raw of v.lines as unknown[]) {
    if (!Array.isArray(raw) || raw.length !== 2 || !(raw[0] in CHARACTERS) || !str(raw[1], 600)) return null;
    lines.push({ who: raw[0] as Who, text: raw[1] });
  }
  return { title: str(v.title, 120) ? v.title : undefined, lines };
}

export function parseConcept(source: string): Concept | null {
  const v = json(source);
  if (!v || !str(v.name, 80) || !str(v.title, 120) || !str(v.what, 600) || !str(v.why, 600)) return null;
  if (v.how !== undefined && !str(v.how, 3000)) return null;
  if (v.bro !== undefined && !str(v.bro, 300)) return null;
  if (v.lang !== undefined && !(str(v.lang, 20) && /^[a-z]+$/.test(v.lang))) return null;
  if (v.show !== undefined && !(Number.isInteger(v.show) && (v.show as number) >= 40 && (v.show as number) <= 600)) return null;
  return {
    name: v.name, title: v.title, what: v.what, why: v.why,
    how: v.how as string | undefined, lang: v.lang as string | undefined, show: v.show as number | undefined, bro: v.bro as string | undefined
  };
}

/** `code` and **bold** inside short texts, as text nodes only. */
export function Rich({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

function Avatar({ who }: { who: Who }) {
  const { Icon, color } = CHARACTERS[who];
  return (
    <span className={styles.avatar} style={{ "--c": color } as CSSProperties} aria-hidden="true">
      <Icon size={20} weight="fill" />
    </span>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
  }, []);
  return reduced;
}

function StoryScene({ story }: { story: Story }) {
  const reduced = useReducedMotion();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(1);
  const all = reduced ? story.lines.length : shown;
  useEffect(() => {
    if (!node || started) return;
    if (typeof IntersectionObserver === "undefined") { setStarted(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setStarted(true);
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, started]);
  useEffect(() => {
    if (!started || reduced || shown >= story.lines.length) return;
    // Reading time of the previous message, so the scene is paced like a real chat.
    const previous = story.lines[shown - 1]!.text.length;
    const timer = window.setTimeout(() => setShown((n) => n + 1), Math.min(2600, 700 + previous * 18));
    return () => window.clearTimeout(timer);
  }, [started, reduced, shown, story.lines]);
  const typing = !reduced && started && all < story.lines.length ? story.lines[all]!.who : null;
  return (
    <figure ref={setNode} className={styles.scene}>
      {story.title ? <figcaption className={styles.sceneTitle}>{story.title}</figcaption> : null}
      <ol className={styles.lines} aria-live="polite">
        {story.lines.map((line, i) => {
          const c = CHARACTERS[line.who];
          const visible = i < all;
          return (
            <li key={i} className={styles.line} data-you={line.who === "you" || undefined}
              data-hidden={!visible || undefined} style={{ "--c": c.color } as CSSProperties}>
              {line.who === "you" ? null : <Avatar who={line.who} />}
              <div className={styles.bubble}>
                {line.who === "you" ? null : <span className={styles.name}>{c.name}</span>}
                <p><Rich text={line.text} /></p>
              </div>
            </li>
          );
        })}
      </ol>
      {typing ? (
        <div className={styles.typing} style={{ "--c": CHARACTERS[typing].color } as CSSProperties} aria-hidden="true">
          <Avatar who={typing} /><span className={styles.dots}><i /><i /><i /></span>
        </div>
      ) : null}
      {!reduced && all < story.lines.length ? (
        <button type="button" className={styles.skip} onClick={() => { setStarted(true); setShown(story.lines.length); }}>
          <FastForward size={14} weight="fill" aria-hidden="true" /> Показать всё
        </button>
      ) : null}
    </figure>
  );
}

function ConceptCard({ concept }: { concept: Concept }) {
  return (
    <section className={styles.concept} aria-label={`${concept.name}: ${concept.title}`}>
      <header className={styles.conceptHead}>
        <code className={styles.tag}>{concept.name}</code>
        <h3>{concept.title}</h3>
      </header>
      <dl className={styles.facts}>
        <div><dt>Что это</dt><dd><Rich text={concept.what} /></dd></div>
        <div><dt>Зачем</dt><dd><Rich text={concept.why} /></dd></div>
      </dl>
      {concept.how ? (
        <div className={styles.how}>
          <span className={styles.howLabel}>Как</span>
          <div className={styles.howGrid} data-preview={concept.show ? "" : undefined}>
            <CodeSnippet code={concept.how} language={concept.lang ?? "html"} />
            {concept.show ? (
              <div className={styles.preview}>
                <span>Так это выглядит</span>
                <iframe title={`Пример: ${concept.title}`} sandbox="" referrerPolicy="no-referrer" loading="lazy"
                  srcDoc={concept.how} style={{ height: concept.show }} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {concept.bro ? (
        <p className={styles.bro} style={{ "--c": CHARACTERS.bro.color } as CSSProperties}>
          <Avatar who="bro" /><span><strong>Бро:</strong> <Rich text={concept.bro} /></span>
        </p>
      ) : null}
    </section>
  );
}

export function StoryFence({ source, fallback }: { source: string; fallback: ReactNode }) {
  const story = useMemo(() => parseStory(source), [source]);
  return story ? <StoryScene story={story} /> : <>{fallback}</>;
}
export function ConceptFence({ source, fallback }: { source: string; fallback: ReactNode }) {
  const concept = useMemo(() => parseConcept(source), [source]);
  return concept ? <ConceptCard concept={concept} /> : <>{fallback}</>;
}
