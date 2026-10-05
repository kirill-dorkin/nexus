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
    let finished = false;
    let forceTimer;
    let releaseTimer;

    const finish = (...args) => {
      if (finished) return;
      finished = true;
      clearTimeout(forceTimer);
      clearTimeout(releaseTimer);
      callback?.(...args);
    };

    const result = nativeClose.call(this, finish);

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
      finish();
    }, releaseAfterMs);
    releaseTimer.unref();

    return result;
  };
}

installBoundedClose(HttpServer, "HTTP server");
installBoundedClose(HttpsServer, "HTTPS server");
