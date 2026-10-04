const NativeWebSocket = globalThis.WebSocket;

if (NativeWebSocket === undefined) {
  throw new Error("Node WebSocket implementation is unavailable.");
}

const commandTimeoutMs = 15_000;

class DeadlineWebSocket extends NativeWebSocket {
  #pendingCommands = new Map();

  constructor(...args) {
    super(...args);
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
          const timer = setTimeout(() => {
            this.#pendingCommands.delete(command.id);
            console.error(
              `CDP command ${command.method} exceeded ${commandTimeoutMs / 1000}s; closing DevTools connection.`
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
