"use client";

import { useEffect, useState } from "react";
import type { SqlJob, SqlRun } from "./sql-engine";

/*
 * Browser side of SQL practice (ADR-0065): one worker per page, one job at a time.
 * A job that runs too long, or a database the learner managed to break, terminates the
 * worker; the next job starts a fresh one. Jobs never reject: failures become error output.
 */

const FIRST_RUN_MS = 60000; // download and start of the engine on a slow connection
const RUN_MS = 5000;

type Queued = { job: SqlJob; key: string | undefined; resolve: (run: SqlRun | null) => void };
let worker: Worker | null = null;
let warm = false;
let running: (Queued & { id: number; timer: number }) | null = null;
let sequence = 0;
const queue: Queued[] = [];

const failed = (job: SqlJob, message: string, hint?: string): SqlRun => ({
  output: { kind: "error", message, ...(hint ? { hint } : {}) },
  results: (job.checks ?? []).map(() => false)
});

function stopWorker() {
  worker?.terminate();
  worker = null;
  warm = false;
}

function finish(run: SqlRun) {
  if (!running) return;
  window.clearTimeout(running.timer);
  running.resolve(run);
  running = null;
  next();
}

function startWorker(): Worker {
  const created = new Worker(new URL("./sql-worker.ts", import.meta.url), { type: "module" });
  created.onmessage = (event: MessageEvent<{ id: number; run?: SqlRun; failure?: "broken" | "failed" }>) => {
    if (event.data.id !== running?.id) return;
    if (event.data.run) {
      warm = true;
      finish(event.data.run);
      return;
    }
    stopWorker();
    finish(event.data.failure === "broken"
      ? failed(running.job, "База данных сломалась и перезапущена.", "Запусти запрос ещё раз.")
      : failed(running.job, "Не удалось запустить базу данных.", "Проверь интернет и обнови страницу."));
  };
  created.onerror = () => {
    stopWorker();
    if (running) finish(failed(running.job, "Движок базы данных упал и перезапущен.", "Возможно, запрос строил слишком большой результат."));
  };
  return created;
}

function next() {
  if (running) return;
  const item = queue.shift();
  if (!item) return;
  worker ??= startWorker();
  const id = ++sequence;
  const limit = warm ? RUN_MS : FIRST_RUN_MS;
  const timer = window.setTimeout(() => {
    stopWorker();
    finish(failed(item.job, `Запрос выполнялся дольше ${RUN_MS / 1000} секунд и был остановлен.`,
      "Проверь условие рекурсии и соединения: возможно, запрос никогда не заканчивается."));
  }, limit);
  running = { ...item, id, timer };
  worker.postMessage({ id, job: item.job });
}

/**
 * Queues a job. A newer job with the same `key` (the same editor) replaces one that has not
 * started yet; the replaced call resolves with null.
 */
export function runSql(job: SqlJob, key?: string): Promise<SqlRun | null> {
  return new Promise((resolve) => {
    if (key !== undefined) {
      const index = queue.findIndex((item) => item.key === key);
      const [replaced] = index >= 0 ? queue.splice(index, 1) : [];
      replaced?.resolve(null);
    }
    queue.push({ job, key, resolve });
    next();
  });
}

/** Runs `job` whenever it changes; `null` runs nothing. */
export function useSqlRun(job: SqlJob | null, key: string): { run: SqlRun | null; busy: boolean } {
  const [state, setState] = useState<{ run: SqlRun | null; busy: boolean }>({ run: null, busy: job !== null });
  const signature = job ? JSON.stringify(job) : "";
  useEffect(() => {
    if (!signature) return;
    let current = true;
    setState((previous) => ({ run: previous.run, busy: true }));
    void runSql(JSON.parse(signature) as SqlJob, key).then((run) => {
      if (current && run) setState({ run, busy: false });
    });
    return () => { current = false; };
  }, [signature, key]);
  return state;
}
