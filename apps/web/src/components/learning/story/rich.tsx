import type { CSSProperties, ReactNode } from "react";
import styles from "../story.module.css";
import { CHARACTERS, type Who } from "./model";

/** `code` and **bold** inside short texts, as text nodes only. */
export function Rich({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

export function Avatar({ who }: { who: Who }) {
  const { Icon, color } = CHARACTERS[who];
  return (
    <span
      className={styles.avatar}
      style={{ "--c": color } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={20} weight="fill" />
    </span>
  );
}
