import type {
  ComponentPropsWithRef,
  CSSProperties,
  HTMLAttributes,
  ReactNode
} from "react";

export { Dialog, type DialogProps } from "./dialog";
export { PasswordInput, type PasswordInputProps } from "./password-input";

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ControlSize = "sm" | "md" | "lg";
export const cx = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");

type ButtonStyle = {
  variant?: ButtonVariant | undefined;
  size?: ControlSize | undefined;
};
export function buttonClass({
  variant = "primary",
  size = "md"
}: ButtonStyle = {}) {
  return cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`);
}
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
export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return <input {...props} className={cx("ui-control", className)} />;
}
export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      {...props}
      className={cx("ui-control", "ui-textarea", className)}
    />
  );
}
export function Select({
  className,
  ...props
}: ComponentPropsWithRef<"select">) {
  return <select {...props} className={cx("ui-control", className)} />;
}
export function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
  className
}: {
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-field", className)}>
      <label htmlFor={htmlFor} className="ui-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="ui-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="ui-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Checkbox({
  label,
  className,
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cx("ui-choice", className)}>
      <input {...props} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
export function Radio({
  label,
  className,
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cx("ui-choice", className)}>
      <input {...props} type="radio" />
      <span>{label}</span>
    </label>
  );
}
export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  disabled = false
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="ui-radio-group" disabled={disabled}>
      <legend className="ui-label">{legend}</legend>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          defaultChecked={option.value === defaultValue}
          label={option.label}
        />
      ))}
    </fieldset>
  );
}
export function Alert({
  tone = "neutral",
  title,
  children,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: string;
  tone?: Tone;
}) {
  return (
    <div
      {...props}
      data-tone={tone}
      role={props.role ?? (tone === "danger" ? "alert" : "status")}
      className={cx("ui-alert", className)}
    >
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
  icon,
  className
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-empty", className)}>
      {icon && (
        <div className="ui-empty-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading level={3} size="card">
        {title}
      </Heading>
      {children && <Text muted>{children}</Text>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cx("ui-skeleton", className)}
    />
  );
}
export function Progress({
  value,
  label,
  className
}: {
  value?: number | undefined;
  label: string;
  className?: string;
}) {
  const safeValue =
    value === undefined || !Number.isFinite(value)
      ? undefined
      : Math.min(100, Math.max(0, value));
  return (
    <div className={cx("ui-progress", className)}>
      <div>
        <span>{label}</span>
        {safeValue !== undefined && <span>{Math.round(safeValue)}%</span>}
      </div>
      <progress max={100} value={safeValue} aria-label={label} />
    </div>
  );
}
export function Disclosure({
  summary,
  children,
  open,
  className
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details open={open} className={cx("ui-disclosure", className)}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
export function CodeBlock({
  children,
  className,
  style
}: {
  children: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <pre className={cx("ui-code", className)} style={style}>
      <code>{children}</code>
    </pre>
  );
}
