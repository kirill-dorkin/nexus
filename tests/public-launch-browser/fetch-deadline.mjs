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

  const forwardAbort = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) {
    forwardAbort();
  } else {
    upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });
  }

  const timeout = setTimeout(() => {
    const message = `Node fetch ${method} ${url} exceeded ${fetchTimeoutMs / 1000}s.`;
    console.error(message);
    controller.abort(new Error(message));
  }, fetchTimeoutMs);
  timeout.unref();

  try {
    return await NativeFetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", forwardAbort);
  }
};
