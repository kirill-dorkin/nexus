import { describe, expect, it } from "vitest";
import { installProviderStubs } from "./provider-stubs.mjs";

function fixture() {
  const listeners = new Map<string, (event: unknown) => void>();
  let rejectRequest: ((error: Error) => void) | undefined;
  const stub = installProviderStubs({
    on: (name: string, handler: (event: unknown) => void) =>
      listeners.set(name, handler),
    send: () =>
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
  });
  return {
    stub,
    emit: (name: string, event: unknown) => listeners.get(name)?.(event),
    reject: (message: string) => rejectRequest?.(new Error(message))
  };
}
const video = {
  requestId: "fetch-1",
  networkId: "network-1",
  request: { url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" }
};
const invalid = "Fetch.fulfillRequest: Invalid InterceptionId.";

describe("provider interception cancellation", () => {
  it("tolerates only an explicitly canceled matching video request", async () => {
    const f = fixture();
    f.emit("Fetch.requestPaused", video);
    f.emit("Network.loadingFailed", {
      requestId: video.networkId,
      canceled: true
    });
    f.reject(invalid);
    await expect(f.stub.assertHealthy()).resolves.toBeUndefined();
  });
  it.each([
    { requestId: "another-request", canceled: true },
    { requestId: video.networkId, canceled: false }
  ])(
    "retains protocol failure without matching canceled evidence: %j",
    async (event) => {
      const f = fixture();
      f.emit("Fetch.requestPaused", video);
      f.emit("Network.loadingFailed", event);
      f.reject(invalid);
      await expect(f.stub.assertHealthy()).rejects.toThrow(invalid);
    }
  );
  it("never hides a payment-script cancellation or other video protocol error", async () => {
    for (const [request, error] of [
      [
        {
          ...video,
          request: { url: "https://cdn.paddle.com/paddle/v2/paddle.js" }
        },
        invalid
      ],
      [video, "Fetch.fulfillRequest: Session closed."]
    ] as const) {
      const f = fixture();
      f.emit("Fetch.requestPaused", request);
      f.emit("Network.loadingFailed", {
        requestId: video.networkId,
        canceled: true
      });
      f.reject(error);
      await expect(f.stub.assertHealthy()).rejects.toThrow(error);
    }
  });
});
