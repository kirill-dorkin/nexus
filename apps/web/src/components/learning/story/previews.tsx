"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useSeenOnce } from "../../../lib/hooks/in-view";
import { isRunnerMessage, needsModule, runnerDocument } from "../js-runner";
import { useSqlRun } from "../sql/sql-client";
import { SqlOutput } from "../sql/sql-output";
import styles from "../story.module.css";

/**
 * Live preview of trusted course HTML. Scripts stay disabled; same-origin is allowed only so the
 * frame can be measured and sized to its content instead of clipping or leaving empty space.
 */
export function AutoHeightPreview({
  title,
  html,
  initial
}: {
  title: string;
  html: string;
  initial: number;
}) {
  const [height, setHeight] = useState(initial);
  return (
    <iframe
      title={title}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      loading="lazy"
      srcDoc={html}
      style={{ height }}
      onLoad={(event) => {
        const doc = event.currentTarget.contentDocument;
        // `body` is typed as always present but is null until the frame has parsed one.
        const body = doc?.body as HTMLElement | null | undefined;
        const measured = doc
          ? Math.max(doc.documentElement.scrollHeight, body?.scrollHeight ?? 0)
          : 0;
        if (measured > 0) setHeight(Math.min(Math.max(measured, 40), 480));
      }}
    />
  );
}

/**
 * Live preview of a JavaScript example: runs in the opaque-origin sandbox of js-runner.ts
 * (scripts on, same-origin off, network closed) and reports its height by message.
 */
export function RunPreview({
  title,
  code,
  page,
  initial
}: {
  title: string;
  code: string;
  page?: string | undefined;
  initial: number;
}) {
  const [height, setHeight] = useState(initial);
  const frame = useRef<HTMLIFrameElement>(null);
  const token = `${useId()}:card`;
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        !isRunnerMessage(event.data, token) ||
        event.data.type !== "size"
      )
        return;
      setHeight(Math.min(Math.max(Math.ceil(event.data.height), 40), 480));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token]);
  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      loading="lazy"
      srcDoc={runnerDocument({
        code,
        page,
        lang: "js",
        mode: "preview",
        token,
        module: needsModule(code)
      })}
      style={{ height }}
    />
  );
}

/** A SQL example run on a fresh copy of the teaching database (sql/, ADR-0065). */
export function SqlPreview({ code }: { code: string }) {
  const id = useId();
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  // The database engine starts only when an example scrolls near, not for every card at once.
  const visible = useSeenOnce(node, { rootMargin: "400px 0px" });
  const sql = useSqlRun(visible ? { code } : null, `${id}:card`);
  return (
    <div ref={setNode} className={styles.sqlPreview}>
      <SqlOutput run={sql.run} busy={sql.busy || !visible} />
    </div>
  );
}
