"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { FastForwardIcon } from "@phosphor-icons/react/dist/ssr";
import { usePrefersReducedMotion } from "../../../lib/hooks/browser";
import { useSeenOnce } from "../../../lib/hooks/in-view";
import { itemAt } from "../../../lib/item-at";
import styles from "../story.module.css";
import { CHARACTERS, type Story } from "./model";
import { Avatar, Rich } from "./rich";

export function StoryScene({ story }: { story: Story }) {
  const reduced = usePrefersReducedMotion();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const started = useSeenOnce(node, { threshold: 0.4 });
  const [shown, setShown] = useState(1);
  const all = reduced ? story.lines.length : shown;
  useEffect(() => {
    if (!started || reduced || shown >= story.lines.length) return;
    // Reading time of the previous message, so the scene is paced like a real chat.
    const previous = itemAt(story.lines, shown - 1).text.length;
    const timer = window.setTimeout(
      () => setShown((n) => n + 1),
      Math.min(2600, 700 + previous * 18)
    );
    return () => window.clearTimeout(timer);
  }, [started, reduced, shown, story.lines]);
  const typing =
    !reduced && started && all < story.lines.length
      ? itemAt(story.lines, all).who
      : null;
  return (
    <figure
      ref={setNode}
      className={styles.scene}
      data-single={story.lines.length === 1 || undefined}
    >
      {story.title ? (
        <figcaption className={styles.sceneTitle}>{story.title}</figcaption>
      ) : null}
      <ol className={styles.lines} aria-live="polite">
        {story.lines.map((line, i) => {
          const c = CHARACTERS[line.who];
          const visible = i < all;
          return (
            <li
              key={i}
              className={styles.line}
              data-you={line.who === "you" || undefined}
              data-hidden={!visible || undefined}
              style={{ "--c": c.color } as CSSProperties}
            >
              {line.who === "you" ? null : <Avatar who={line.who} />}
              <div className={styles.bubble}>
                {line.who === "you" ? null : (
                  <span className={styles.name}>{c.name}</span>
                )}
                <p>
                  <Rich text={line.text} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {typing ? (
        <div
          className={styles.typing}
          style={{ "--c": CHARACTERS[typing].color } as CSSProperties}
          aria-hidden="true"
        >
          <Avatar who={typing} />
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
      {!reduced && all < story.lines.length ? (
        <button
          type="button"
          className={styles.skip}
          onClick={() => setShown(story.lines.length)}
        >
          <FastForwardIcon size={14} weight="fill" aria-hidden="true" />{" "}
          Показать всё
        </button>
      ) : null}
    </figure>
  );
}
