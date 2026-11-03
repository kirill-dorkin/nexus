"use client";
import { useId } from "react";
import type { CourseManifestV1 } from "@platform/contracts";
import {
  Button,
  Field as ControlField,
  IconButton,
  Input,
  Textarea
} from "@platform/ui";
import styles from "../studio.module.css";

/** Applies a change to a clone of the working document. */
export type Edit = (change: (document: CourseManifestV1) => void) => void;

/** A labelled text input or textarea bound to one document value. */
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  readOnly = false,
  maxLength = 50000,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <ControlField htmlFor={id} label={label} hint={hint}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
          rows={4}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
        />
      )}
    </ControlField>
  );
}

/** Move up, move down and remove for one item of a list. */
export function Order({
  label,
  index,
  count,
  onMove,
  onRemove
}: {
  label: string;
  index: number;
  count: number;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.orderActions}>
      <IconButton
        type="button"
        aria-label={`${label}: вверх`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </IconButton>
      <IconButton
        type="button"
        aria-label={`${label}: вниз`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </IconButton>
      <Button
        variant="ghost"
        className={styles.remove}
        type="button"
        onClick={onRemove}
      >
        Удалить {label.toLowerCase()}
      </Button>
    </div>
  );
}
