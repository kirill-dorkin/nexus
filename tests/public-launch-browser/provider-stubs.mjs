// Test-only provider responses. Never swallow unrelated protocol failures.
export function installProviderStubs(cdp) {
  const canceledRequests = new Set();
  const pending = new Set();
  let failure;
  cdp.on("Network.loadingFailed", (event) => {
    if (event.canceled) canceledRequests.add(event.requestId);
  });
  cdp.on("Fetch.requestPaused", (event) => {
    const isVideo = event.request.url.startsWith(
      "https://www.youtube-nocookie.com/"
    );
    const content = isVideo
      ? "<!doctype html><html><body>Video provider stub</body></html>"
      : "window.Paddle={Environment:{set:function(){}},Initialize:function(){},Checkout:{open:function(options){window.__paddleOpenedSuccessUrl=options.settings.successUrl;}}};";
    const work = cdp
      .send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: 200,
        responseHeaders: [
          {
            name: "content-type",
            value: isVideo
              ? "text/html; charset=utf-8"
              : "application/javascript; charset=utf-8"
          }
        ],
        body: Buffer.from(content).toString("base64")
      })
      .catch((error) => {
        // Navigating away may detach a lazy video iframe between requestPaused and
        // fulfilment. Only tolerate that exact error with matching Network evidence.
        if (
          isVideo &&
          event.networkId &&
          canceledRequests.has(event.networkId) &&
          error.message === "Fetch.fulfillRequest: Invalid InterceptionId."
        )
          return;
        failure ??= error;
      })
      .finally(() => pending.delete(work));
    pending.add(work);
  });
  return {
    async assertHealthy() {
      await Promise.all([...pending]);
      if (failure) throw failure;
    }
  };
}
