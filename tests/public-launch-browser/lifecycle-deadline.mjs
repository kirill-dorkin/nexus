import childProcess, { ChildProcess } from "node:child_process";
import { Server as HttpServer } from "node:http";
import { Server as HttpsServer } from "node:https";
import { syncBuiltinESMExports } from "node:module";

const forceAfterMs = 750;
const releaseAfterMs = 2_000;

function installProcessGroupIsolation() {
  if (process.platform === "win32") return;

  const nativeSpawn = childProcess.spawn;
  childProcess.spawn = function isolatedSpawn(command, args, options = {}) {
    return nativeSpawn(command, args, {
      ...options,
      detached: true
    });
  };
  syncBuiltinESMExports();
}

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

function installChildTreeKill() {
  const prototype = ChildProcess?.prototype;
  if (!prototype || prototype.__nexusBrowserKillTree) return;

  const nativeKill = prototype.kill;
  Object.defineProperty(prototype, "__nexusBrowserKillTree", {
    configurable: false,
    enumerable: false,
    value: true
  });

  prototype.kill = function killTree(signal = "SIGTERM") {
    console.error(`[browser-launch] child process tree kill requested ${signal}.`);

    let groupSignalled = false;
    if (process.platform !== "win32" && Number.isInteger(this.pid)) {
      try {
        process.kill(-this.pid, signal);
        groupSignalled = true;
      } catch (error) {
        if (!(error && typeof error === "object" && error.code === "ESRCH")) {
          console.error(
            `[browser-launch] child process group ${signal} failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (signal === "SIGTERM") {
        const processGroupId = this.pid;
        const forceTimer = setTimeout(() => {
          try {
            process.kill(-processGroupId, "SIGKILL");
            console.error(
              "[browser-launch] child process tree forced SIGKILL after grace period."
            );
          } catch (error) {
            if (!(error && typeof error === "object" && error.code === "ESRCH")) {
              console.error(
                `[browser-launch] child process group SIGKILL failed: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
        }, forceAfterMs);
        forceTimer.unref();
      }
    }

    let directSignalled = false;
    if (this.exitCode === null) {
      directSignalled = nativeKill.call(this, signal);
    }
    return groupSignalled || directSignalled;
  };
}

installProcessGroupIsolation();
installBoundedClose(HttpServer, "HTTP server");
installBoundedClose(HttpsServer, "HTTPS server");
installChildTreeKill();

process.on("beforeExit", (code) => {
  console.error(`[browser-launch] process beforeExit ${code}.`);
});
process.on("exit", (code) => {
  console.error(`[browser-launch] process exit ${code}.`);
});
