import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Band } from "./band";

/*
 * Web Audio is not available in tests, so a recording context stands in for
 * it: every node creation, connection, parameter change and scheduled event
 * is written to a trace. The trace pins down exactly what the band asks the
 * audio graph to do, so refactors can prove they play the same music.
 */

type Recorder = { ctx: BaseAudioContext; trace: string[] };

function recordingContext(): Recorder {
  const trace: string[] = [];
  let next = 0;
  const format = (value: unknown): string => {
    if (typeof value === "number")
      return Number.isFinite(value) ? value.toFixed(5) : String(value);
    if (
      typeof value === "function" ||
      (typeof value === "object" && value !== null && names.has(value))
    )
      return names.get(value) ?? "fn";
    if (value instanceof Float32Array) {
      let sum = 0;
      for (const v of value) sum += v;
      return `Float32Array(${value.length}, Σ=${sum.toFixed(3)})`;
    }
    return JSON.stringify(value) ?? String(value);
  };
  const names = new WeakMap<object, string>();
  const node = (name: string): unknown => {
    const proxy: object = new Proxy(() => undefined, {
      get(_, prop) {
        if (typeof prop === "symbol" || prop === "then") return undefined;
        return node(`${name}.${prop}`);
      },
      set(_, prop, value) {
        trace.push(`${name}.${String(prop)} = ${format(value)}`);
        return true;
      },
      apply(_, __, args: unknown[]) {
        const id = `#${next++}`;
        trace.push(`${id} = ${name}(${args.map(format).join(", ")})`);
        // connect() returns its target, as Web Audio does.
        if (name.endsWith(".connect") && args[0] !== undefined) return args[0];
        return node(id);
      }
    });
    names.set(proxy, name);
    return proxy;
  };
  const buffers = (channels: number, length: number) => {
    const data = Array.from(
      { length: channels },
      () => new Float32Array(length)
    );
    const buffer = { getChannelData: (c: number) => data[c] };
    names.set(buffer, `buffer#${next++}`);
    trace.push(`${names.get(buffer)} = createBuffer(${channels}, ${length})`);
    return buffer;
  };
  const base = node("ctx") as object;
  const ctx = new Proxy(base, {
    get(target, prop) {
      if (prop === "sampleRate") return 100;
      if (prop === "currentTime") return 0;
      if (prop === "createBuffer") return buffers;
      return Reflect.get(target, prop);
    }
  }) as BaseAudioContext;
  return { ctx, trace };
}

beforeEach(() => {
  let seed = 1;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Band", () => {
  it("builds the same audio graph and schedules the same notes for eight bars", () => {
    const { ctx, trace } = recordingContext();
    const band = new Band(ctx, 42);
    const bars = Array.from({ length: 8 }, (_, i) =>
      band.playBar(i, i * Band.barSeconds())
    );
    band.stop(100);

    expect(bars.flatMap((bar) => bar.events).length).toBeGreaterThan(20);
    expect(trace.length).toBeGreaterThan(500);
    expect(trace.join("\n")).toMatchSnapshot();
  });

  it("schedules each bar at its own start time", () => {
    const { ctx, trace } = recordingContext();
    const band = new Band(ctx, 7);
    const before = trace.length;
    band.playBar(3, 12.5);
    const scheduled = trace
      .slice(before)
      .filter((line) => line.includes(".start("));
    expect(scheduled.length).toBeGreaterThan(0);
    for (const line of scheduled) {
      const at = Number(/\.start\(([\d.]+)/.exec(line)?.[1]);
      expect(at).toBeGreaterThanOrEqual(12.5 - 0.1);
    }
  });
});
