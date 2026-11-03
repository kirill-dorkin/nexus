"use client";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRightIcon,
  FileIcon,
  FolderIcon
} from "@phosphor-icons/react/dist/ssr";
import { useIsClient } from "../../../lib/hooks/browser";
import { highlight, type Token } from "../code-highlight";
import codeStyles from "../code.module.css";
import styles from "../lesson-visuals.module.css";
import { PALETTE, type FlowStep, type TreeItem, type UrlPart } from "./model";

export function Frame({
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

export function UrlDiagram({ parts }: { parts: UrlPart[] }) {
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

export function TreeDiagram({ items }: { items: TreeItem[] }) {
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

export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
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
export function DomDiagram({ html }: { html: string }) {
  // DOMParser exists only in the browser; the server renders the placeholder.
  const isClient = useIsClient();
  const tree = useMemo(() => {
    if (!isClient) return null;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const full = /<html[\s>]/i.test(html);
    return toTree(full ? doc.documentElement : doc.body);
  }, [isClient, html]);
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

export function Tokens({ tokens }: { tokens: Token[] }) {
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
