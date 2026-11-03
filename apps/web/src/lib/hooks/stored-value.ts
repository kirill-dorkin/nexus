"use client";
// localStorage as an external store: one subscription per key, updates from
// this tab (writeStoredValue) and from other tabs (the storage event).
// Storage can be unavailable (privacy modes); reads then yield null and writes are dropped.
import { useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener();
}

export function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a value and updates every component that reads the same key. */
export function writeStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
  notify(key);
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The stored string for `key`; null on the server, when absent or when storage is unavailable. */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => readStoredValue(key),
    () => null
  );
}
