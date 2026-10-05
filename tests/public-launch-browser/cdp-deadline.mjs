const NativeWebSocket = globalThis.WebSocket;

if (NativeWebSocket === undefined) {
  throw new Error("Node WebSocket implementation is unavailable.");
}

const connectionTimeoutMs = 15_000;
const commandTimeoutMs = 15_000;

class DeadlineWebSocket extends NativeWebSocket {
  #pendingCommands = new Map();

  constructor(...args) {
    super(...args);

    const connectionTimer = setTimeout(() => {
      console.error(
        `[browser-launch] DevTools WebSocket connection exceeded ${connectionTimeoutMs / 1000}s; rejecting the connection.`
      );
      this.dispatchEvent(new Event("error"));
      this.close(1011, "DevTools connection deadline exceeded");
    }, connectionTimeoutMs);
    connectionTimer.unref();

    const clearConnectionTimer = () => clearTimeout(connectionTimer);
    this.addEventListener(
      "open",
      () => {
        clearConnectionTimer();
        console.error("[browser-launch] DevTools WebSocket connected.");
      },
      { once: true }
    );
    this.addEventListener("close", clearConnectionTimer, { once: true });
    this.addEventListener("error", clearConnectionTimer, { once: true });

    this.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data);
        if (typeof message.id !== "number") return;
        const pending = this.#pendingCommands.get(message.id);
        if (pending === undefined) return;
        clearTimeout(pending.timer);
        this.#pendingCommands.delete(message.id);
      } catch {
        // The verification client owns protocol parsing. This hook only enforces deadlines.
      }
    });
    this.addEventListener("close", () => this.#clearPending());
    this.addEventListener("error", () => this.#clearPending());
  }

  send(data) {
    if (typeof data === "string") {
      try {
        const command = JSON.parse(data);
        if (
          typeof command.id === "number" &&
          typeof command.method === "string"
        ) {
          if (command.method === "Page.navigate") {
            console.error(
              `[browser-launch] navigate ${String(command.params?.url ?? "unknown")}`
            );
          }
          const timer = setTimeout(() => {
            this.#pendingCommands.delete(command.id);
            const message = `CDP command ${command.method} exceeded ${commandTimeoutMs / 1000}s.`;
            console.error(
              `[browser-launch] ${message} Rejecting the pending command and closing DevTools connection.`
            );
            this.dispatchEvent(
              new MessageEvent("message", {
                data: JSON.stringify({
                  id: command.id,
                  error: { message }
                })
              })
            );
            this.close(1011, "CDP command deadline exceeded");
          }, commandTimeoutMs);
          timer.unref();
          this.#pendingCommands.set(command.id, {
            method: command.method,
            timer
          });
        }
      } catch {
        // Non-CDP WebSocket data is outside this diagnostic boundary.
      }
    }

    return super.send(data);
  }

  #clearPending() {
    for (const pending of this.#pendingCommands.values()) {
      clearTimeout(pending.timer);
    }
    this.#pendingCommands.clear();
  }
}

globalThis.WebSocket = DeadlineWebSocket;
