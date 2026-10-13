import { afterEach, describe, expect, it, vi } from "vitest";
import { browserApiRequest, publicApiUrl } from "./public-api";
import { resolveServerApiUrl } from "./server-api-url";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Web/API deployment transport", () => {
  it("keeps browser credentials on the shared public /v1 path", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "/");
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await browserApiRequest("/v1/me", { method: "GET" });
    expect(fetch).toHaveBeenCalledWith(
      "/v1/me",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        method: "GET"
      })
    );
    expect(
      resolveServerApiUrl(
        "/v1/public/learning",
        "https://internal.example/service/"
      )
    ).toBe("https://internal.example/service/v1/public/learning");
    expect(publicApiUrl("/v1/me")).toBe("/v1/me");
  });

  it("retains the explicit absolute-origin standalone profile", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example");
    expect(publicApiUrl("/v1/me")).toBe("https://api.example/v1/me");
    expect(resolveServerApiUrl("/v1/public/learning", undefined)).toBe(
      "https://api.example/v1/public/learning"
    );
    expect(
      resolveServerApiUrl("/v1/public/learning", "http://internal.example")
    ).toBe("http://internal.example/v1/public/learning");
  });

  it("requires the runtime binding for same-origin server reads", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "/");
    expect(() => resolveServerApiUrl("/v1/public/learning", undefined)).toThrow(
      "API_INTERNAL_URL is required"
    );
  });

  it.each([
    "",
    "not-a-url",
    "file:///tmp/api",
    "https://user:pass@internal.example",
    "https://internal.example?x=1",
    "https://internal.example#fragment"
  ])(
    "fails closed on malformed binding %s instead of falling back publicly",
    (binding) => {
      vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example");
      expect(() =>
        resolveServerApiUrl("/v1/public/learning", binding)
      ).toThrow();
    }
  );

  it.each([
    "",
    "https://evil.example/v1/me",
    "//evil.example/v1/me",
    "/\\evil.example/v1/me",
    "/\n/evil.example/v1/me",
    "/\t/evil.example/v1/me"
  ])(
    "rejects a path that could change the configured authority: %s",
    (path) => {
      vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "/");
      expect(() => publicApiUrl(path)).toThrow();
      expect(() =>
        resolveServerApiUrl(path, "https://internal.example")
      ).toThrow();
    }
  );

  it.each([
    undefined,
    "",
    "https://api.example/v1",
    "https://api.example/",
    "//api.example",
    "file:///tmp/api"
  ])("rejects missing or invalid public origin %s", (origin) => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", origin);
    expect(() => publicApiUrl("/v1/me")).toThrow();
  });
});
