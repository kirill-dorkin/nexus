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
  // The native close event is dispatched asynchronously. A close requested by the
  // caller (open became false) must not call onDismiss later, or a stale event could
  // dismiss state the caller has set since (for example, a newly reopened dialog).
  const closingFromProps = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingFromProps.current = true;
      dialog.close();
    }
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  return (
    // A click on the backdrop closes the dialog; Escape is handled natively
    // by <dialog>, so keyboard users already have an equivalent.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      {...props}
      ref={ref}
      className={`ui-dialog ${className}`}
      onClose={() => {
        if (closingFromProps.current) {
          closingFromProps.current = false;
          return;
        }
        onDismiss();
      }}
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
