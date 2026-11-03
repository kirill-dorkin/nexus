import type { ComponentPropsWithRef } from "react";
import {
  buttonClass,
  cx,
  type ButtonStyle,
  type ControlSize
} from "./class-names";

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  type = "button",
  className,
  ...props
}: ComponentPropsWithRef<"button"> & ButtonStyle & { loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClass({ variant, size }), className)}
    />
  );
}
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentPropsWithRef<"a"> & ButtonStyle & { href: string }) {
  return (
    <a {...props} className={cx(buttonClass({ variant, size }), className)}>
      {children}
    </a>
  );
}
export function IconButton({
  className,
  size = "md",
  ...props
}: ComponentPropsWithRef<"button"> & {
  "aria-label": string;
  size?: ControlSize;
}) {
  return (
    <Button
      {...props}
      variant="ghost"
      size={size}
      className={cx("ui-icon-button", className)}
    />
  );
}
