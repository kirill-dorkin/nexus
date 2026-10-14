"use client";
import { useState, type ComponentPropsWithRef } from "react";
export type PasswordInputProps = Omit<ComponentPropsWithRef<"input">, "type">;
/** Visibility is presentation only; native value/validation/autocomplete remain intact. */
export function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="ui-password">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`ui-control ${className}`}
      />
      <button
        type="button"
        className="ui-password-toggle"
        disabled={props.disabled}
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? "Скрыть" : "Показать"}
      </button>
    </div>
  );
}
