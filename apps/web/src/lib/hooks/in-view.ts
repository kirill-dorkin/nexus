"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

const subscribeNever = () => () => undefined;

/**
 * Becomes true the first time `element` comes near the viewport and then stays true.
 * Without IntersectionObserver the element counts as visible.
 */
export function useSeenOnce(
  element: Element | null,
  {
    threshold = 0,
    rootMargin = "0px"
  }: { threshold?: number; rootMargin?: string } = {}
): boolean {
  const supported = useSyncExternalStore(
    subscribeNever,
    () => typeof IntersectionObserver !== "undefined",
    // Assume support while rendering on the server, so hydration matches.
    () => true
  );
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!supported || !element || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { threshold, rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [supported, element, seen, threshold, rootMargin]);
  return seen || !supported;
}
