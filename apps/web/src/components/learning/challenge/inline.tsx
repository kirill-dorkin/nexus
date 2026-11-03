import type { ReactNode } from "react";

/** `inline code` in task and hint text, rendered as text nodes only. */
export function Inline({ text }: { text: string }): ReactNode {
  return text
    .split(/(`[^`]+`)/)
    .map((part, i) =>
      part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        part
      )
    );
}
