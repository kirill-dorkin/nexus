"use client";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import {
  ArrowCounterClockwiseIcon,
  PauseIcon,
  PlayIcon
} from "@phosphor-icons/react/dist/ssr";
import { usePrefersReducedMotion } from "../../../lib/hooks/browser";
import { useSeenOnce } from "../../../lib/hooks/in-view";
import { itemAt } from "../../../lib/item-at";
import { highlight } from "../code-highlight";
import { Rich } from "../story";
import codeStyles from "../code.module.css";
import styles from "../lesson-visuals.module.css";
import {
  caretOffset,
  partStarts,
  sceneFrames,
  STAGES,
  tokenLines
} from "./frames";
import { PALETTE, type Scene, type UrlPart } from "./model";

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
  const starts = partStarts(parts);
  return (
    <ol className={styles.parts} aria-hidden="true">
      {parts.map((part, i) => {
        const startAt = itemAt(starts, i);
        const end = startAt + part.text.length;
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

function useVisibleOnce<T extends Element>() {
  const [element, setElement] = useState<T | null>(null);
  const visible = useSeenOnce(element, { threshold: 0.6 });
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
  const starts = partStarts(parts);
  return (
    <>
      {parts.map((part, i) => {
        const start = itemAt(starts, i);
        const text = input.slice(
          start,
          Math.min(start + part.text.length, typed)
        );
        return text ? (
          <span key={i} style={{ color: PALETTE[i % PALETTE.length] }}>
            {text}
          </span>
        ) : null;
      })}
    </>
  );
}

export function TypingDemo({ scene, file }: { scene: Scene; file: string }) {
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
