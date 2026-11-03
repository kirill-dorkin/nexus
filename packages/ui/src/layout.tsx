import type { HTMLAttributes } from "react";
import { cx } from "./class-names";

export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("ui-container", className)} />;
}
type Spacing = "xs" | "sm" | "md" | "lg" | "xl";
export function Stack({
  className,
  gap = "md",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: Spacing }) {
  return (
    <div {...props} data-gap={gap} className={cx("ui-stack", className)} />
  );
}
export function Inline({
  className,
  gap = "sm",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: Spacing }) {
  return (
    <div {...props} data-gap={gap} className={cx("ui-inline", className)} />
  );
}
export function Grid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("ui-grid", className)} />;
}
type SurfaceStyle = {
  appearance?: "glass" | "solid" | "quiet";
  padding?: "none" | "sm" | "md" | "lg";
};
export function Surface({
  appearance = "glass",
  padding = "md",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & SurfaceStyle) {
  return (
    <div
      {...props}
      data-appearance={appearance}
      data-padding={padding}
      className={cx("ui-surface", className)}
    />
  );
}
export function Card({
  appearance = "glass",
  padding = "md",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & SurfaceStyle) {
  return (
    <article
      {...props}
      data-appearance={appearance}
      data-padding={padding}
      className={cx("ui-surface", "ui-card", className)}
    />
  );
}
