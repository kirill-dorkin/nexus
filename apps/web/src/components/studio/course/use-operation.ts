"use client";
import { useRef, useState } from "react";
import { errorMessage } from "../studio-api";

/**
 * Runs one Studio command at a time: `busy` while it runs, its error or
 * success message afterwards. A second call while one runs is ignored.
 */
export function useOperation(onFailure: (error: unknown) => void) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
      onFailure(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, setError, setMessage, run };
}
