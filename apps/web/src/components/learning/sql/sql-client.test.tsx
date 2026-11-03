import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SqlJob, SqlRun } from "./sql-engine";

type Posted = { id: number; job: SqlJob };
type Reply = { id: number; run?: SqlRun; failure?: "broken" | "failed" };

/** Stands in for the SQL Web Worker; the test answers each posted job. */
class FakeWorker {
  static all: FakeWorker[] = [];
  posted: Posted[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent<Reply>) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(message: Posted) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  answer(reply: Reply) {
    this.onmessage?.({ data: reply } as MessageEvent<Reply>);
  }
}
const lastWorker = () => {
  const worker = FakeWorker.all.at(-1);
  if (!worker) throw new Error("No worker started");
  return worker;
};
const rows = (n: number): SqlRun => ({
  output: { kind: "rows", columns: ["n"], rows: [[String(n)]], total: 1 },
  results: []
});

// A fresh module per test: the client keeps one worker and queue per page.
async function client() {
  vi.resetModules();
  return import("./sql-client");
}

beforeEach(() => {
  FakeWorker.all = [];
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useSqlRun", () => {
  it("runs nothing for a null job", async () => {
    const { useSqlRun } = await client();
    const { result } = renderHook(() => useSqlRun(null, "editor"));
    expect(result.current).toEqual({ run: null, busy: false });
    expect(FakeWorker.all).toHaveLength(0);
  });

  it("is busy until the worker answers, then shows the run", async () => {
    const { useSqlRun } = await client();
    const { result } = renderHook(() =>
      useSqlRun({ code: "SELECT 1" }, "editor")
    );
    expect(result.current.busy).toBe(true);
    const [posted] = lastWorker().posted;
    expect(posted?.job).toEqual({ code: "SELECT 1" });

    await act(async () => {
      lastWorker().answer({ id: posted?.id ?? 0, run: rows(1) });
      await Promise.resolve();
    });
    expect(result.current).toEqual({ run: rows(1), busy: false });
  });

  it("keeps the previous result on screen while a new job runs", async () => {
    const { useSqlRun } = await client();
    const { result, rerender } = renderHook(
      ({ code }) => useSqlRun({ code }, "editor"),
      {
        initialProps: { code: "SELECT 1" }
      }
    );
    await act(async () => {
      lastWorker().answer({ id: 1, run: rows(1) });
      await Promise.resolve();
    });

    rerender({ code: "SELECT 2" });
    expect(result.current).toEqual({ run: rows(1), busy: true });
    await act(async () => {
      lastWorker().answer({ id: 2, run: rows(2) });
      await Promise.resolve();
    });
    expect(result.current).toEqual({ run: rows(2), busy: false });
  });

  it("stops being busy when the job is withdrawn", async () => {
    const { useSqlRun } = await client();
    const { result, rerender } = renderHook<
      ReturnType<typeof useSqlRun>,
      { job: SqlJob | null }
    >(({ job }) => useSqlRun(job, "editor"), {
      initialProps: { job: { code: "SELECT 1" } }
    });
    rerender({ job: null });
    expect(result.current.busy).toBe(false);
  });
});

describe("runSql", () => {
  it("replaces a queued job of the same editor and resolves it with null", async () => {
    const { runSql } = await client();
    const first = runSql({ code: "SELECT 1" }, "editor");
    const queued = runSql({ code: "SELECT 2" }, "editor");
    const replacement = runSql({ code: "SELECT 3" }, "editor");
    await expect(queued).resolves.toBeNull();

    lastWorker().answer({ id: 1, run: rows(1) });
    await expect(first).resolves.toEqual(rows(1));
    expect(lastWorker().posted.at(-1)?.job).toEqual({ code: "SELECT 3" });
    lastWorker().answer({ id: 2, run: rows(3) });
    await expect(replacement).resolves.toEqual(rows(3));
  });

  it("restarts a broken database for the next job", async () => {
    const { runSql } = await client();
    const broken = runSql({
      code: "DROP SCHEMA public CASCADE",
      checks: [{ sql: "SELECT 1" }]
    });
    const first = lastWorker();
    first.answer({ id: 1, failure: "broken" });
    await expect(broken).resolves.toEqual({
      output: {
        kind: "error",
        message: "База данных сломалась и перезапущена.",
        hint: "Запусти запрос ещё раз."
      },
      results: [false]
    });
    expect(first.terminated).toBe(true);

    void runSql({ code: "SELECT 1" });
    expect(lastWorker()).not.toBe(first);
  });

  it("stops a query that never finishes", async () => {
    vi.useFakeTimers();
    const { runSql } = await client();
    const pending = runSql({
      code: "WITH RECURSIVE r AS (SELECT 1 UNION ALL SELECT 1 FROM r) SELECT * FROM r"
    });
    vi.advanceTimersByTime(60_000);
    const run = await pending;
    expect(run?.output).toMatchObject({
      kind: "error",
      message: expect.stringContaining("был остановлен")
    });
    expect(lastWorker().terminated).toBe(true);
  });
});
