"use client";
// Browser facts read through useSyncExternalStore: a fixed value while
// rendering on the server and during hydration, the live value afterwards,
// and no setState inside effects.
import { useSyncExternalStore } from "react";

const subscribeNever = () => () => undefined;

/** False on the server and during hydration, true once running in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

/** The page origin in the browser, "" on the server. */
export function useBrowserOrigin(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => ""
  );
}

const reducedMotion = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(reducedMotion);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the visitor asked for less motion; follows changes to the setting. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia(reducedMotion).matches,
    () => false
  );
}
