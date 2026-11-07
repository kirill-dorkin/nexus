import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// happy-dom has no WebGL: the renderer is replaced by a recorder; everything else is real three.js.
const renders = vi.hoisted(() => ({ count: 0, disposed: 0 }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class FakeRenderer {
    domElement = document.createElement("canvas");
    outputEncoding = 0;
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render() {
      renders.count += 1;
    }
    dispose() {
      renders.disposed += 1;
    }
    forceContextLoss = vi.fn();
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});

import { renderPortraits } from "./portraits";
import { createStage } from "./stage";

let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  renders.count = renders.disposed = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
});
afterEach(() => vi.unstubAllGlobals());

const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) frames.shift()?.(i * 16);
};

describe("character stage", () => {
  it("shows a character, follows the level, rotates on drag and cleans up", () => {
    const host = document.createElement("div");
    Object.defineProperty(host, "clientWidth", { value: 800 });
    Object.defineProperty(host, "clientHeight", { value: 500 });
    host.setPointerCapture = vi.fn();
    document.body.append(host);
    const stage = createStage(host, false);
    expect(stage.show("unknown")).toBe(false);
    expect(stage.show("css")).toBe(true);
    stage.setLevel(100);
    runFrames(40);
    expect(renders.count).toBeGreaterThan(10);
    host.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, pointerId: 1 })
    );
    host.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 60, pointerId: 1 })
    );
    host.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    expect(stage.show("sql")).toBe(true);
    runFrames(5);
    expect(host.querySelector("canvas")).not.toBeNull();
    stage.dispose();
    expect(renders.disposed).toBe(1);
    expect(host.querySelector("canvas")).toBeNull();
  });
});

describe("roster portraits", () => {
  it("draws one image per character with a body and skips the rest", () => {
    const images = renderPortraits([
      { slug: "pc", level: 10 },
      { slug: "js", level: 90 },
      { slug: "angular", level: 50 }
    ]);
    expect(Object.keys(images)).toEqual(["pc", "js"]);
    expect(renders.count).toBe(2);
    expect(renders.disposed).toBe(1);
  });
});
