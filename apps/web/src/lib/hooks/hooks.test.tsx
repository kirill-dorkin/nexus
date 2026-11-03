import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useBrowserOrigin,
  useIsClient,
  usePrefersReducedMotion
} from "./browser";
import { useSeenOnce } from "./in-view";
import {
  readStoredValue,
  useStoredValue,
  writeStoredValue
} from "./stored-value";

describe("useIsClient and useBrowserOrigin", () => {
  it("render the server value on the server and the browser value on the client", () => {
    function Probe() {
      return (
        <p>{`${String(useIsClient())} ${useBrowserOrigin() || "none"}`}</p>
      );
    }
    expect(renderToString(<Probe />)).toContain("false none");
    render(<Probe />);
    expect(
      screen.getByText(`true ${window.location.origin}`)
    ).toBeInTheDocument();
  });
});

describe("usePrefersReducedMotion", () => {
  let matches = false;
  const listeners = new Set<() => void>();
  beforeEach(() => {
    matches = false;
    listeners.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener)
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the system setting while mounted", () => {
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      for (const listener of listeners) listener();
    });
    expect(result.current).toBe(true);
    unmount();
    expect(listeners.size).toBe(0);
  });
});

describe("useStoredValue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads the stored value and updates on writes from this tab", () => {
    localStorage.setItem("k", "a");
    const { result } = renderHook(() => useStoredValue("k"));
    expect(result.current).toBe("a");
    act(() => {
      writeStoredValue("k", "b");
    });
    expect(result.current).toBe("b");
  });

  it("updates on writes from another tab", () => {
    const { result } = renderHook(() => useStoredValue("k"));
    act(() => {
      localStorage.setItem("k", "other");
      window.dispatchEvent(new StorageEvent("storage", { key: "k" }));
    });
    expect(result.current).toBe("other");
  });

  it("treats unavailable storage as empty", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    expect(readStoredValue("k")).toBeNull();
    expect(() => {
      writeStoredValue("k", "x");
    }).not.toThrow();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("useSeenOnce", () => {
  type Callback = (entries: { isIntersecting: boolean }[]) => void;
  let callback: Callback | undefined;
  let options: IntersectionObserverInit | undefined;
  const disconnect = vi.fn();

  function Probe() {
    const [element, setElement] = useState<HTMLDivElement | null>(null);
    const seen = useSeenOnce(element, { threshold: 0.5 });
    return <div ref={setElement}>{seen ? "seen" : "not yet"}</div>;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns true when the element intersects and stops observing", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: Callback, init?: IntersectionObserverInit) {
          callback = cb;
          options = init;
        }
        observe = vi.fn();
        disconnect = disconnect;
      }
    );
    render(<Probe />);
    expect(screen.getByText("not yet")).toBeInTheDocument();
    expect(options).toEqual({ threshold: 0.5, rootMargin: "0px" });

    act(() => callback?.([{ isIntersecting: false }]));
    expect(screen.getByText("not yet")).toBeInTheDocument();
    act(() => callback?.([{ isIntersecting: true }]));
    expect(screen.getByText("seen")).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });

  it("counts as seen without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Probe />);
    expect(screen.getByText("seen")).toBeInTheDocument();
  });
});
