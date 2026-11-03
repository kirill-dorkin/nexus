/** Shared tokens of the primitives' class names. */

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ControlSize = "sm" | "md" | "lg";
export const cx = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");

export type ButtonStyle = {
  variant?: ButtonVariant | undefined;
  size?: ControlSize | undefined;
};
export function buttonClass({
  variant = "primary",
  size = "md"
}: ButtonStyle = {}) {
  return cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`);
}
