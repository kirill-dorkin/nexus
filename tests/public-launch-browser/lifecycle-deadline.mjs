import { ChildProcess } from "node:child_process";
import { Server as HttpServer } from "node:http";
import { Server as HttpsServer } from "node:https";

const forceAfterMs = 750;
const releaseAfterMs = 2_000;

function installBoundedClose(ServerClass, label) {
  const prototype = ServerClass?.prototype;
  if (!prototype || prototype.__nexusBrowserBoundedClose) return;

  const nativeClose = prototype.close;
  Object.defineProperty(prototype, "__nexusBrowserBoundedClose", {
    configurable: false,
    enumerable: false,
    value: true
  });

  prototype.close = function boundedClose(callback) {
    console.error(`[browser-launch] ${label} close requested.`);
    let finished = false;
    let forceTimer;
    let releaseTimer;

    const finish = (source, ...args) => {
      if (finished) return;
      finished = true;
      clearTimeout(forceTimer);
      clearTimeout(releaseTimer);
      console.error(
        `[browser-launch] ${label} close wait complete (${source}).`
      );
      callback?.(...args);
    };

    const result = nativeClose.call(this, (...args) => finish("native", ...args));

    forceTimer = setTimeout(() => {
      console.error(
        `[browser-launch] ${label} close still pending after ${forceAfterMs}ms; closing remaining connections.`
      );
      try {
        this.closeIdleConnections?.();
        this.closeAllConnections?.();
      } catch (error) {
        console.error(
          `[browser-launch] ${label} forced connection cleanup failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, forceAfterMs);
    forceTimer.unref();

    releaseTimer = setTimeout(() => {
      console.error(
        `[browser-launch] ${label} close exceeded ${releaseAfterMs}ms; releasing teardown wait.`
      );
      try {
        this.unref?.();
      } catch {
        // Best-effort teardown only.
      }
      finish("deadline");
    }, releaseAfterMs);
    releaseTimer.unref();

    return result;
  };
}

function installChildKillTrace() {
  const prototype = ChildProcess?.prototype;
  if (!prototype || prototype.__nexusBrowserKillTrace) return;

  const nativeKill = prototype.kill;
  Object.defineProperty(prototype, "__nexusBrowserKillTrace", {
    configurable: false,
    enumerable: false,
    value: true
  });

  prototype.kill = function tracedKill(signal) {
    console.error(
      `[browser-launch] child process kill requested ${signal ?? "SIGTERM"}.`
    );
    return nativeKill.call(this, signal);
  };
}

installBoundedClose(HttpServer, "HTTP server");
installBoundedClose(HttpsServer, "HTTPS server");
installChildKillTrace();

process.on("beforeExit", (code) => {
  console.error(`[browser-launch] process beforeExit ${code}.`);
});
process.on("exit", (code) => {
  console.error(`[browser-launch] process exit ${code}.`);
});
