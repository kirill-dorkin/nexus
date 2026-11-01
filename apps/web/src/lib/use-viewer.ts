"use client";

import { useEffect, useState } from "react";
import { browserApiRequest } from "./public-api";

/** "anonymous" only on a definite 401; any other failure stays "unknown" so we never nag by mistake. */
export type ViewerState = "unknown" | "anonymous" | "signed-in";

let pending: Promise<ViewerState> | null = null;

function loadViewer(): Promise<ViewerState> {
  pending ??= browserApiRequest("/v1/me")
    .then((response): ViewerState => (response.status === 401 ? "anonymous" : response.ok ? "signed-in" : "unknown"))
    .catch((): ViewerState => "unknown");
  return pending;
}

/** One shared /v1/me request per page, for components that only need to know who is looking. */
export function useViewer(): ViewerState {
  const [state, setState] = useState<ViewerState>("unknown");
  useEffect(() => {
    let alive = true;
    void loadViewer().then((value) => alive && setState(value));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
