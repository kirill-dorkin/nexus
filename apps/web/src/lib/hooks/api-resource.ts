"use client";
import { useCallback, useEffect, useState } from "react";

import { browserApiRequest } from "../public-api";

export type Resource<T> =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "error" }
  | { status: "ready"; data: T };

const loading: Resource<never> = { status: "loading" };

/**
 * Reads `path` from the API and parses it with a contract schema. Changing
 * `version` (or `path`) reloads; until the new answer arrives the resource is
 * "loading", derived from the request key instead of being reset in an effect.
 * `set` replaces the value for the current key (after a command returned fresh data).
 */
export function useApiResource<T>(
  path: string,
  schema: { parse(value: unknown): T },
  version = 0
): readonly [Resource<T>, (value: Resource<T>) => void] {
  const key = `${version}:${path}`;
  const [state, setState] = useState<{
    key: string;
    value: Resource<T>;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      let value: Resource<T>;
      try {
        const response = await browserApiRequest(path, {
          signal: controller.signal
        });
        value =
          response.status === 401
            ? { status: "anonymous" }
            : response.ok
              ? { status: "ready", data: schema.parse(await response.json()) }
              : { status: "error" };
      } catch {
        value = { status: "error" };
      }
      if (!controller.signal.aborted) setState({ key, value });
    })();
    return () => {
      controller.abort();
    };
  }, [key, path, schema]);

  const set = useCallback(
    (value: Resource<T>) => {
      setState({ key, value });
    },
    [key]
  );
  return [state?.key === key ? state.value : loading, set] as const;
}
