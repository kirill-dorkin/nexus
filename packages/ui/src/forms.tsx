import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./class-names";

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
