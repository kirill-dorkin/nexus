"use client";

import { Button, type ButtonVariant } from "@platform/ui";
import { lazy, Suspense, useState } from "react";

// The dialog and its schema load only when someone opens it (ADR-0085), so page
// budgets do not change.
const FeedbackDialog = lazy(() =>
  import("./feedback-dialog").then((module) => ({
    default: module.FeedbackDialog
  }))
);

/** «Сообщить» button that opens the feedback dialog for the current page. */
export function FeedbackLauncher({
  label = "Сообщить о проблеме или идее",
  variant = "secondary",
  className
}: {
  label?: string;
  variant?: ButtonVariant;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={className}
        aria-haspopup="dialog"
        onClick={() => {
          setRequested(true);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {requested && (
        <Suspense fallback={null}>
          <FeedbackDialog open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
