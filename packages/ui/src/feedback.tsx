import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx, type Tone } from "./class-names";
import { Heading, Text } from "./typography";

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
