import type { HTMLAttributes } from "react";
import { cx, type Tone } from "./class-names";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span {...props} data-tone={tone} className={cx("ui-badge", className)} />
  );
}
export function Eyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cx("ui-eyebrow", className)} />;
}
export function Heading({
  level = 2,
  size = "section",
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "display" | "section" | "card" | "small";
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag {...props} data-size={size} className={cx("ui-heading", className)} />
  );
}
export function Text({
  muted = false,
  size = "md",
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  muted?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <p
      {...props}
      data-size={size}
      data-muted={muted || undefined}
      className={cx("ui-text", className)}
    />
  );
}
export function Divider({
  className,
  ...props
}: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={cx("ui-divider", className)} />;
}
