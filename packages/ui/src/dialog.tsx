"use client";

import { useEffect, useRef, type ComponentProps } from "react";

export type DialogProps = Omit<ComponentProps<"dialog">, "open" | "onClose"> & {
  open: boolean;
  onDismiss: () => void;
};

/** Native modal: top layer, inert background, focus containment and Escape. */
export function Dialog({
  open,
  onDismiss,
  className = "",
  children,
  onClick,
  ...props
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      className={`ui-dialog ${className}`}
      onClose={onDismiss}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.target !== event.currentTarget)
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          event.currentTarget.close();
        }
      }}
    >
      {children}
    </dialog>
  );
}
