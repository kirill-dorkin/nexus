"use client";
import { itemAt } from "../../lib/item-at";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  FileIcon,
  FolderIcon,
  PauseIcon,
  PlayIcon
} from "@phosphor-icons/react/dist/ssr";
import { highlight, type Token } from "./code-highlight";
import { Rich } from "./story";
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
type Scene = {
  input: string;
  key?: string;
  output?: string;
  caption?: string;
  parts?: UrlPart[];
};

export type Visual =
  | { kind: "url"; title?: string | undefined; parts: UrlPart[] }
  | { kind: "tree"; title?: string | undefined; items: TreeItem[] }
  | { kind: "flow"; title?: string | undefined; steps: FlowStep[] }
  | { kind: "dom"; title?: string | undefined; html: string }
  | {
      kind: "typing";
      title?: string | undefined;
      file?: string | undefined;
      scenes: Scene[];
    };

const str = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.length <= max;
const record = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;

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
  const list = (value: unknown, max: number): unknown[] | null =>
    Array.isArray(value) && value.length > 0 && value.length <= max
      ? (value as unknown[])
      : null;
  switch (v.kind) {
    case "url": {
      const parts = list(v.parts, 12)?.filter(
        (p): p is UrlPart =>
          str(record(p)?.text, 200) && str(record(p)?.label, 60)
      );
      return parts?.length ? { kind: "url", title, parts } : null;
    }
    case "tree": {
      const items = list(v.items, 60)?.filter((i): i is TreeItem => {
        const item = record(i);
        const depth = item?.depth;
        return (
          str(item?.name, 120) &&
          typeof depth === "number" &&
          Number.isInteger(depth) &&
          depth >= 0 &&
          depth <= 8 &&
          (item.note === undefined || str(item.note, 160))
        );
      });
      return items?.length ? { kind: "tree", title, items } : null;
    }
    case "flow": {
      const steps = list(v.steps, 8)?.filter((s): s is FlowStep => {
        const step = record(s);
        return (
          str(step?.title, 60) &&
          (step.text === undefined || str(step.text, 240))
        );
      });
      return steps?.length ? { kind: "flow", title, steps } : null;
    }
    case "dom":
      return str(v.html, 4000) ? { kind: "dom", title, html: v.html } : null;
    case "typing": {
      // One animation per block: { input, key, output, caption, parts }. `scenes` is still accepted.
      const isScene = (s: unknown): s is Scene => {
        const c = s as Record<string, unknown> | null;
        return (
          !!c &&
          str(c.input, 400) &&
          (c.key === undefined || str(c.key, 20)) &&
          (c.output === undefined || str(c.output, 2000)) &&
          (c.caption === undefined || str(c.caption, 200)) &&
          (c.parts === undefined ||
            (Array.isArray(c.parts) &&
              c.parts.length <= 12 &&
              c.parts.every(
                (p) => str(record(p)?.text, 60) && str(record(p)?.label, 60)
              )))
        );
      };
      const scenes = (
        Array.isArray(v.scenes) ? list(v.scenes, 10) : [v]
      )?.filter(isScene);
      const file = str(v.file, 60) ? v.file : undefined;
      return scenes?.length ? { kind: "typing", title, file, scenes } : null;
    }
    default:
      return null;
  }
}

const PALETTE = [
  "#7dd3fc",
  "#c4b5fd",
  "#f0abfc",
  "#fdba74",
  "#bef264",
  "#fda4af",
  "#93c5fd",
  "#fcd34d"
];

function Frame({
  title,
  kind,
  children
}: {
  title: string | undefined;
  kind: string;
  children: ReactNode;
}) {
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
          <span
            key={i}
            className={styles.urlPart}
            style={{ "--c": PALETTE[i % PALETTE.length] } as CSSProperties}
          >
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
  if (name.endsWith(".css")) return "#c4b5fd";
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
          <li
            key={i}
            style={
              {
                "--depth": item.depth,
                "--c": colorFor(item.name)
              } as CSSProperties
            }
          >
            <span className={styles.treeName}>
              {folder ? (
                <FolderIcon size={18} weight="fill" aria-hidden="true" />
              ) : (
                <FileIcon size={18} aria-hidden="true" />
              )}
              <code>{item.name}</code>
            </span>
            {item.note ? (
              <span className={styles.treeNote}>{item.note}</span>
            ) : null}
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
        <li
          key={i}
          style={
            { "--i": i, "--c": PALETTE[i % PALETTE.length] } as CSSProperties
          }
        >
          <span className={styles.flowIndex} aria-hidden="true">
            {i + 1}
          </span>
          <span className={styles.flowBody}>
            <strong>{step.title}</strong>
            {step.text ? <span>{step.text}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

type DomNode = {
  tag: string;
  attrs: string;
  children: DomNode[];
  text?: string;
};

function toTree(node: Node, depth = 0): DomNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    return text
      ? {
          tag: "#text",
          attrs: "",
          children: [],
          text: text.length > 40 ? `${text.slice(0, 40)}…` : text
        }
      : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || depth > 12) return null;
  const element = node as Element;
  const attrs = [...element.attributes]
    .slice(0, 3)
    .map((a) => `${a.name}="${a.value.slice(0, 24)}"`)
    .join(" ");
  return {
    tag: element.tagName.toLowerCase(),
    attrs,
    children: [...element.childNodes]
      .map((child) => toTree(child, depth + 1))
      .filter((n): n is DomNode => n !== null)
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
          {node.attrs ? (
            <span className={codeStyles.attr}> {node.attrs}</span>
          ) : null}
        </span>
      )}
      {node.children.length ? (
        <ul>
          {node.children.map((child, i) => (
            <DomBranch key={i} node={child} />
          ))}
        </ul>
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
      <pre className={styles.domSource}>
        <code>
          <Tokens tokens={highlight(html, "html")} />
        </code>
      </pre>
      <div className={styles.domArrow} aria-hidden="true">
        <ArrowRightIcon size={22} />
      </div>
      <div className={styles.domTree} aria-label="DOM-дерево">
        {tree ? (
          <ul>
            <DomBranch node={tree} />
          </ul>
        ) : (
          <p className={styles.domText}>Строим дерево…</p>
        )}
      </div>
    </div>
  );
}

function Tokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === "plain" ? (
          t.text
        ) : (
          <span key={i} className={codeStyles[t.kind]}>
            {t.text}
          </span>
        )
      )}
    </>
  );
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

/** Where Emmet leaves the caret after expanding: the first empty attribute or element. */
export function caretOffset(output: string) {
  const blank = /\n( *)\n/.exec(output);
  const candidates = [
    output.indexOf('""') + 1,
    output.indexOf("></") + 1,
    blank ? blank.index + 1 + itemAt(blank, 1).length : 0
  ].filter((i) => i > 0);
  return candidates.length ? Math.min(...candidates) : output.length;
}

/** Splits highlighted tokens into lines, inserting a caret marker at a character offset. */
function tokenLines(tokens: Token[], caretAt: number) {
  let line: (Token | "caret")[] = [];
  const lines: (Token | "caret")[][] = [line];
  let offset = 0;
  for (const token of tokens) {
    let text = token.text;
    let start = offset;
    while (text.length) {
      const breakAt = text.indexOf("\n");
      const chunkEnd = breakAt < 0 ? text.length : breakAt;
      let chunk = text.slice(0, chunkEnd);
      if (caretAt >= start && caretAt < start + chunk.length) {
        const before = chunk.slice(0, caretAt - start);
        if (before) line.push({ kind: token.kind, text: before });
        line.push("caret");
        chunk = chunk.slice(before.length);
        start += before.length;
        caretAt = -1;
      }
      if (chunk) line.push({ kind: token.kind, text: chunk });
      start += chunk.length;
      if (breakAt < 0) break;
      if (caretAt === start) {
        line.push("caret");
        caretAt = -1;
      }
      line = [];
      lines.push(line);
      start += 1;
      text = text.slice(chunkEnd + 1);
    }
    offset += token.text.length;
  }
  if (caretAt >= offset) line.push("caret");
  return lines;
}

type Phase = "ready" | "typing" | "key" | "result";
type Tick = { phase: Phase; typed: number; ms: number };

/** One scene as a list of timed frames: a short wait, human-paced typing, the key, the result. */
function sceneFrames(scene: Scene): Tick[] {
  const frames: Tick[] = [{ phase: "ready", typed: 0, ms: 650 }];
  for (let i = 1; i <= scene.input.length; i++) {
    const ch = itemAt(scene.input, i - 1);
    // Symbols take a moment longer than letters, like a real person typing.
    frames.push({
      phase: "typing",
      typed: i,
      ms: /[a-z0-9]/i.test(ch) ? 95 : 190
    });
  }
  frames.push({ phase: "typing", typed: scene.input.length, ms: 650 });
  if (scene.key)
    frames.push({ phase: "key", typed: scene.input.length, ms: 650 });
  frames.push({ phase: "result", typed: scene.input.length, ms: 0 });
  return frames;
}

function KeyCap({ label, pressed }: { label: string; pressed?: boolean }) {
  return (
    <kbd className={`${styles.key} ${pressed ? styles.keyDown : ""}`}>
      {label}
    </kbd>
  );
}

function AbbreviationParts({
  parts,
  typed,
  done
}: {
  parts: UrlPart[];
  typed: number;
  done: boolean;
}) {
  let end = 0;
  return (
    <ol className={styles.parts} aria-hidden="true">
      {parts.map((part, i) => {
        const startAt = end;
        end += part.text.length;
        const state =
          done || typed >= end ? "done" : typed > startAt ? "active" : "idle";
        return (
          <li
            key={i}
            data-state={state}
            style={{ "--c": PALETTE[i % PALETTE.length] } as CSSProperties}
          >
            <code>{part.text}</code>
            <span>{part.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const STAGES: { phase: Phase[]; label: string }[] = [
  { phase: ["ready", "typing"], label: "Печатаем" },
  { phase: ["key"], label: "Жмём" },
  { phase: ["result"], label: "Результат" }
];

function useVisibleOnce<T extends Element>() {
  const [element, setElement] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, visible]);
  return [setElement, visible] as const;
}

function EditorWindow({
  file,
  children,
  flash,
  lines
}: {
  file: string;
  children: ReactNode;
  flash?: boolean;
  lines: number;
}) {
  return (
    <div className={styles.window}>
      <div className={styles.windowBar} aria-hidden="true">
        <span />
        <span />
        <span />
        <em>{file}</em>
      </div>
      <pre
        className={`${styles.editor} ${flash ? styles.expanded : ""}`}
        style={{ "--lines": lines } as CSSProperties}
        aria-hidden="true"
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

function ResultLines({ output }: { output: string }) {
  const lines = tokenLines(highlight(output, "html"), caretOffset(output));
  return (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          className={styles.line}
          style={{ "--line": i } as CSSProperties}
        >
          {line.map((part, j) =>
            part === "caret" ? (
              <span key={j} className={styles.caret} />
            ) : part.kind === "plain" ? (
              part.text
            ) : (
              <span key={j} className={codeStyles[part.kind]}>
                {part.text}
              </span>
            )
          )}
          {"\n"}
        </span>
      ))}
    </>
  );
}

/** The abbreviation typed so far, each part in the colour of its legend chip. */
function TypedInput({
  input,
  typed,
  parts
}: {
  input: string;
  typed: number;
  parts: UrlPart[] | undefined;
}) {
  if (!parts) return <>{input.slice(0, typed)}</>;
  let start = 0;
  return (
    <>
      {parts.map((part, i) => {
        const text = input.slice(
          start,
          Math.min(start + part.text.length, typed)
        );
        start += part.text.length;
        return text ? (
          <span key={i} style={{ color: PALETTE[i % PALETTE.length] }}>
            {text}
          </span>
        ) : null;
      })}
    </>
  );
}

function TypingDemo({ scene, file }: { scene: Scene; file: string }) {
  const frames = useMemo(() => sceneFrames(scene), [scene]);
  const reduced = usePrefersReducedMotion();
  const [ref, visible] = useVisibleOnce<HTMLDivElement>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  const last = frames.length - 1;
  useEffect(() => {
    if (reduced || !visible || paused || index >= last) return;
    const timer = window.setTimeout(
      () => setIndex((i) => Math.min(i + 1, last)),
      itemAt(frames, index).ms
    );
    return () => window.clearTimeout(timer);
  }, [index, paused, reduced, visible, frames, last, run]);
  const frame = reduced ? itemAt(frames, last) : itemAt(frames, index);
  const finished = frame.phase === "result";
  const parts =
    scene.parts?.map((p) => p.text).join("") === scene.input
      ? scene.parts
      : undefined;
  const stage = STAGES.findIndex((s) => s.phase.includes(frame.phase));
  const description = `${scene.caption ? `${scene.caption}. ` : ""}Ввод «${scene.input}»${scene.key ? `, затем клавиша ${scene.key}` : ""}${scene.output ? `. Результат: ${scene.output}` : ""}`;
  return (
    <div ref={ref} className={styles.typing} data-phase={frame.phase}>
      <ol className={styles.stages} aria-hidden="true">
        {STAGES.filter((s) => scene.key || s.label !== "Жмём").map((s) => {
          const i = STAGES.indexOf(s);
          return (
            <li
              key={s.label}
              data-state={i < stage ? "done" : i === stage ? "active" : "idle"}
            >
              {s.label === "Жмём" && scene.key ? (
                <>
                  Жмём <KeyCap label={scene.key} />
                </>
              ) : (
                s.label
              )}
            </li>
          );
        })}
      </ol>
      <div className={styles.stage}>
        <EditorWindow
          file={file}
          flash={finished && !reduced}
          lines={(scene.output ?? scene.input).split("\n").length}
        >
          {finished && scene.output !== undefined ? (
            <ResultLines key={run} output={scene.output} />
          ) : (
            <>
              <TypedInput
                input={scene.input}
                typed={frame.typed}
                parts={parts}
              />
              <span className={styles.caret} />
            </>
          )}
        </EditorWindow>
        {frame.phase === "key" && scene.key ? (
          <div className={styles.keyPop} aria-hidden="true">
            <KeyCap label={scene.key} pressed />
          </div>
        ) : null}
        <div className={styles.progress} aria-hidden="true">
          <span
            style={{
              width: `${Math.round((reduced ? 1 : index / last) * 100)}%`
            }}
          />
        </div>
      </div>
      {parts ? (
        <AbbreviationParts parts={parts} typed={frame.typed} done={finished} />
      ) : null}
      <div className={styles.typingFooter}>
        <span className={styles.caption} data-shown={finished || undefined}>
          {scene.caption ? <Rich text={scene.caption} /> : null}
        </span>
        {reduced ? null : finished ? (
          <button
            type="button"
            className={styles.replay}
            onClick={() => {
              setIndex(0);
              setPaused(false);
              setRun((r) => r + 1);
            }}
          >
            <ArrowCounterClockwiseIcon
              size={16}
              weight="bold"
              aria-hidden="true"
            />{" "}
            Повторить
          </button>
        ) : (
          <button
            type="button"
            className={styles.play}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Продолжить анимацию" : "Пауза анимации"}
          >
            {paused ? (
              <PlayIcon size={16} weight="fill" aria-hidden="true" />
            ) : (
              <PauseIcon size={16} weight="fill" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      <p className={styles.srOnly}>{description}</p>
    </div>
  );
}

export function LessonVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "url":
      return (
        <Frame title={visual.title} kind="url">
          <UrlDiagram parts={visual.parts} />
        </Frame>
      );
    case "tree":
      return (
        <Frame title={visual.title} kind="tree">
          <TreeDiagram items={visual.items} />
        </Frame>
      );
    case "flow":
      return (
        <Frame title={visual.title} kind="flow">
          <FlowDiagram steps={visual.steps} />
        </Frame>
      );
    case "dom":
      return (
        <Frame title={visual.title} kind="dom">
          <DomDiagram html={visual.html} />
        </Frame>
      );
    case "typing":
      // Every scene is its own animation; a legacy multi-scene block becomes a stack of them.
      return (
        <>
          {visual.scenes.map((scene, i) => (
            <Frame
              key={i}
              title={
                visual.scenes.length > 1
                  ? (scene.caption ?? visual.title)
                  : visual.title
              }
              kind="typing"
            >
              <TypingDemo scene={scene} file={visual.file ?? "index.html"} />
            </Frame>
          ))}
        </>
      );
  }
}

/** Markdown entry point: draws a valid visual, otherwise shows the source as code. */
export function VisualBlock({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const visual = useMemo(() => parseVisual(source), [source]);
  return visual ? <LessonVisual visual={visual} /> : <>{fallback}</>;
}
