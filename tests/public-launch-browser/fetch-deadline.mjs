const NativeFetch = globalThis.fetch;

if (NativeFetch === undefined) {
  throw new Error("Node fetch implementation is unavailable.");
}

const fetchTimeoutMs = 5_000;

globalThis.fetch = async function fetchWithDeadline(input, init = {}) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const method =
    init.method ?? (input instanceof Request ? input.method : "GET");
  const url = input instanceof Request ? input.url : String(input);
  const startedAt = Date.now();

  console.error(`[browser-launch] node-fetch start ${method} ${url}`);

  const forwardAbort = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) {
    forwardAbort();
  } else {
    upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });
  }

  const timeout = setTimeout(() => {
    const message = `Node fetch ${method} ${url} exceeded ${fetchTimeoutMs / 1000}s.`;
    console.error(`[browser-launch] ${message}`);
    controller.abort(new Error(message));
  }, fetchTimeoutMs);
  timeout.unref();

  try {
    const response = await NativeFetch(input, {
      ...init,
      signal: controller.signal
    });
    console.error(
      `[browser-launch] node-fetch done ${method} ${url} status=${response.status} durationMs=${Date.now() - startedAt}`
    );
    return response;
  } catch (error) {
    console.error(
      `[browser-launch] node-fetch failed ${method} ${url} durationMs=${Date.now() - startedAt}: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", forwardAbort);
  }
};
