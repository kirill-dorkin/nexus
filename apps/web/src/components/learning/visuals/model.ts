/*
 * Lesson visuals authored as JSON inside ```diagram and ```demo Markdown fences.
 * Everything is validated here and rendered as text nodes; invalid JSON falls back
 * to an ordinary code block in SafeMarkdown.
 */

export type UrlPart = { text: string; label: string };
export type TreeItem = { name: string; depth: number; note?: string };
export type FlowStep = { title: string; text?: string };
export type Scene = {
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

export const PALETTE = [
  "#7dd3fc",
  "#c4b5fd",
  "#f0abfc",
  "#fdba74",
  "#bef264",
  "#fda4af",
  "#93c5fd",
  "#fcd34d"
];
