"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, File, Folder, Pause, Play } from "@phosphor-icons/react/dist/ssr";
import { highlight, type Token } from "./code-highlight";
import styles from "./lesson-visuals.module.css";
import codeStyles from "./code.module.css";

/*
 * Lesson visuals authored as JSON inside ```diagram and ```demo Markdown fences.
 * Everything is validated here and rendered as text nodes; invalid JSON falls back
 * to an ordinary code block in SafeMarkdown.
 */

type UrlPart = { text: string; label: string };
type TreeItem = { name: string; depth: number; note?: string };
type FlowStep = { title: string; text?: string };
type Scene = { input: string; key?: string; output?: string; caption?: string };

export type Visual =
  | { kind: "url"; title?: string | undefined; parts: UrlPart[] }
  | { kind: "tree"; title?: string | undefined; items: TreeItem[] }
  | { kind: "flow"; title?: string | undefined; steps: FlowStep[] }
  | { kind: "dom"; title?: string | undefined; html: string }
  | { kind: "typing"; title?: string | undefined; scenes: Scene[] };

const str = (v: unknown, max = 2000): v is string => typeof v === "string" && v.length <= max;

/** Parses and validates a visual description; returns null if anything is off. */
export function parseVisual(source: string): Visual | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const title = str(v.title, 200) ? v.title : undefined;
  const list = (value: unknown, max: number) => (Array.isArray(value) && value.length > 0 && value.length <= max ? value : null);
  switch (v.kind) {
    case "url": {
      const parts = list(v.parts, 12)?.filter((p): p is UrlPart => str(p?.text, 200) && str(p?.label, 60));
      return parts?.length ? { kind: "url", title, parts } : null;
    }
    case "tree": {
      const items = list(v.items, 60)?.filter((i): i is TreeItem =>
        str(i?.name, 120) && Number.isInteger(i?.depth) && i.depth >= 0 && i.depth <= 8 && (i.note === undefined || str(i.note, 160)));
      return items?.length ? { kind: "tree", title, items } : null;
    }
    case "flow": {
      const steps = list(v.steps, 8)?.filter((s): s is FlowStep => str(s?.title, 60) && (s.text === undefined || str(s.text, 240)));
      return steps?.length ? { kind: "flow", title, steps } : null;
    }
    case "dom":
      return str(v.html, 4000) ? { kind: "dom", title, html: v.html } : null;
    case "typing": {
      const scenes = list(v.scenes, 10)?.filter((s): s is Scene =>
        str(s?.input, 400) && (s.key === undefined || str(s.key, 20)) && (s.output === undefined || str(s.output, 2000)) &&
        (s.caption === undefined || str(s.caption, 200)));
      return scenes?.length ? { kind: "typing", title, scenes } : null;
    }
    default:
      return null;
  }
}

const PALETTE = ["#7dd3fc", "#c4b5fd", "#f0abfc", "#fdba74", "#bef264", "#fda4af", "#93c5fd", "#fcd34d"];

function Frame({ title, kind, children }: { title: string | undefined; kind: string; children: ReactNode }) {
  return (
    <figure className={styles.frame} data-kind={kind}>
      {title ? <figcaption className={styles.title}>{title}</figcaption> : null}
      {children}
    </figure>
  );
}

function UrlDiagram({ parts }: { parts: UrlPart[] }) {
  return (
    <div className={styles.url}>
      <div className={styles.urlLine}>
        {parts.map((part, i) => (
          <span key={i} className={styles.urlPart} style={{ "--c": PALETTE[i % PALETTE.length] } as CSSProperties}>
            <code>{part.text}</code>
            <span className={styles.urlLabel}>{part.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function colorFor(name: string) {
  if (name.endsWith("/")) return "#fcd34d";
  if (/\.html?$/.test(name)) return "#7dd3fc";
  if (/\.css$/.test(name)) return "#c4b5fd";
  if (/\.(js|mjs|json)$/.test(name)) return "#fdba74";
  if (/\.(png|jpe?g|webp|avif|svg|gif)$/.test(name)) return "#bef264";
  return "#a1a1aa";
}

function TreeDiagram({ items }: { items: TreeItem[] }) {
  return (
    <ul className={styles.tree}>
      {items.map((item, i) => {
        const folder = item.name.endsWith("/");
        return (
          <li key={i} style={{ "--depth": item.depth, "--c": colorFor(item.name) } as CSSProperties}>
            <span className={styles.treeName}>
              {folder ? <Folder size={18} weight="fill" aria-hidden="true" /> : <File size={18} aria-hidden="true" />}
              <code>{item.name}</code>
            </span>
            {item.note ? <span className={styles.treeNote}>{item.note}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className={styles.flow}>
      {steps.map((step, i) => (
        <li key={i} style={{ "--i": i, "--c": PALETTE[i % PALETTE.length] } as CSSProperties}>
          <span className={styles.flowIndex} aria-hidden="true">{i + 1}</span>
          <strong>{step.title}</strong>
          {step.text ? <span>{step.text}</span> : null}
          {i < steps.length - 1 ? <ArrowRight className={styles.flowArrow} size={20} aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

type DomNode = { tag: string; attrs: string; children: DomNode[]; text?: string };

function toTree(node: Node, depth = 0): DomNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    return text ? { tag: "#text", attrs: "", children: [], text: text.length > 40 ? `${text.slice(0, 40)}…` : text } : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || depth > 12) return null;
  const element = node as Element;
  const attrs = [...element.attributes].slice(0, 3).map((a) => `${a.name}="${a.value.slice(0, 24)}"`).join(" ");
  return {
    tag: element.tagName.toLowerCase(),
    attrs,
    children: [...element.childNodes].map((child) => toTree(child, depth + 1)).filter((n): n is DomNode => n !== null)
  };
}

function DomBranch({ node }: { node: DomNode }) {
  return (
    <li>
      {node.tag === "#text" ? (
        <span className={styles.domText}>«{node.text}»</span>
      ) : (
        <span className={styles.domTag}>
          <span className={codeStyles.tag}>{node.tag}</span>
          {node.attrs ? <span className={codeStyles.attr}> {node.attrs}</span> : null}
        </span>
      )}
      {node.children.length ? (
        <ul>{node.children.map((child, i) => <DomBranch key={i} node={child} />)}</ul>
      ) : null}
    </li>
  );
}

/** Parses author HTML into an inert document (no scripts run) and draws its DOM tree. */
function DomDiagram({ html }: { html: string }) {
  const [tree, setTree] = useState<DomNode | null>(null);
  useEffect(() => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const full = /<html[\s>]/i.test(html);
    setTree(toTree(full ? doc.documentElement : doc.body));
  }, [html]);
  return (
    <div className={styles.dom}>
      <pre className={styles.domSource}><code><Tokens tokens={highlight(html, "html")} /></code></pre>
      <div className={styles.domArrow} aria-hidden="true"><ArrowRight size={22} /></div>
      <div className={styles.domTree} aria-label="DOM-дерево">
        {tree ? <ul><DomBranch node={tree} /></ul> : <p className={styles.domText}>Строим дерево…</p>}
      </div>
    </div>
  );
}

function Tokens({ tokens }: { tokens: Token[] }) {
  return <>{tokens.map((t, i) => (t.kind === "plain" ? t.text : <span key={i} className={codeStyles[t.kind]}>{t.text}</span>))}</>;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = () => setReduced(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

type Step = { text: string; key: string | null; output: boolean; caption: string; scene: number };

/** Precomputes every animation frame: typing, key press, expansion, pause. */
function timeline(scenes: Scene[]) {
  const frames: { frame: Step; ms: number }[] = [];
  scenes.forEach((scene, n) => {
    const base = { key: null, output: false, caption: scene.caption ?? "", scene: n };
    for (let i = 1; i <= scene.input.length; i++) frames.push({ frame: { ...base, text: scene.input.slice(0, i) }, ms: 70 });
    frames.push({ frame: { ...base, text: scene.input }, ms: 500 });
    if (scene.key) frames.push({ frame: { ...base, text: scene.input, key: scene.key }, ms: 700 });
    if (scene.output !== undefined) frames.push({ frame: { ...base, text: scene.output, output: true }, ms: 2600 });
    else frames.push({ frame: { ...base, text: scene.input }, ms: 1600 });
  });
  return frames;
}

function TypingDemo({ scenes }: { scenes: Scene[] }) {
  const frames = useMemo(() => timeline(scenes), [scenes]);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (reduced || !playing) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % frames.length), frames[index]!.ms);
    return () => window.clearTimeout(timer);
  }, [index, playing, reduced, frames]);
  if (reduced) {
    return (
      <ol className={styles.staticScenes}>
        {scenes.map((scene, i) => (
          <li key={i}>
            <code>{scene.input}</code>
            {scene.key ? <kbd className={styles.key}>{scene.key}</kbd> : null}
            {scene.output ? <pre><code><Tokens tokens={highlight(scene.output, "html")} /></code></pre> : null}
            {scene.caption ? <span>{scene.caption}</span> : null}
          </li>
        ))}
      </ol>
    );
  }
  const { frame } = frames[index]!;
  return (
    <div className={styles.typing}>
      <div className={styles.window}>
        <div className={styles.windowBar} aria-hidden="true">
          <span /><span /><span />
          <em>index.html</em>
        </div>
        <pre className={`${styles.editor} ${frame.output ? styles.expanded : ""}`} aria-hidden="true">
          <code>
            <Tokens tokens={highlight(frame.text, frame.output ? "html" : "text")} />
            {!frame.output ? <span className={styles.caret} /> : null}
          </code>
        </pre>
        {frame.key ? <kbd className={`${styles.key} ${styles.keyPop}`} aria-hidden="true">{frame.key}</kbd> : null}
      </div>
      <div className={styles.typingFooter}>
        <span className={styles.caption} aria-live="off">{frame.caption}</span>
        <span className={styles.controls}>
          {scenes.length > 1 ? <span className={styles.counter}>{frame.scene + 1} / {scenes.length}</span> : null}
          <button type="button" className={styles.play} onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Пауза анимации" : "Продолжить анимацию"}>
            {playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
          </button>
        </span>
      </div>
      <p className={styles.srOnly}>
        {scenes.map((s) => `${s.caption ?? ""}: ввод «${s.input}»${s.key ? `, клавиша ${s.key}` : ""}${s.output ? `, результат: ${s.output}` : ""}`).join(". ")}
      </p>
    </div>
  );
}

export function LessonVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "url":
      return <Frame title={visual.title} kind="url"><UrlDiagram parts={visual.parts} /></Frame>;
    case "tree":
      return <Frame title={visual.title} kind="tree"><TreeDiagram items={visual.items} /></Frame>;
    case "flow":
      return <Frame title={visual.title} kind="flow"><FlowDiagram steps={visual.steps} /></Frame>;
    case "dom":
      return <Frame title={visual.title} kind="dom"><DomDiagram html={visual.html} /></Frame>;
    case "typing":
      return <Frame title={visual.title} kind="typing"><TypingDemo scenes={visual.scenes} /></Frame>;
  }
}

/** Markdown entry point: draws a valid visual, otherwise shows the source as code. */
export function VisualBlock({ source, fallback }: { source: string; fallback: ReactNode }) {
  const visual = useMemo(() => parseVisual(source), [source]);
  return visual ? <LessonVisual visual={visual} /> : <>{fallback}</>;
}
