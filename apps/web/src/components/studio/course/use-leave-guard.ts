"use client";
import { useEffect, useState } from "react";

/**
 * While `blocked`, warns before the tab closes and turns same-origin link
 * clicks into a pending destination the editor can confirm or cancel.
 */
export function useLeaveGuard(blocked: boolean, active: boolean) {
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  useEffect(() => {
    if (!blocked) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [blocked]);
  useEffect(() => {
    if (!blocked || !active) return;
    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setLeaveHref(
        destination.pathname + destination.search + destination.hash
      );
    };
    window.document.addEventListener("click", intercept, true);
    return () => window.document.removeEventListener("click", intercept, true);
  }, [blocked, active]);
  return [leaveHref, setLeaveHref] as const;
}
