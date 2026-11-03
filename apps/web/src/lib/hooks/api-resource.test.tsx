import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../public-api";
import { useApiResource } from "./api-resource";

vi.mock("../public-api", () => ({ browserApiRequest: vi.fn() }));
const api = vi.mocked(browserApiRequest);
const schema = {
  parse(value: unknown): { n: number } {
    const n = (value as { n?: unknown } | null)?.n;
    if (typeof n !== "number") throw new TypeError("n must be a number");
    return { n };
  }
};
const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

beforeEach(() => {
  api.mockReset();
});

describe("useApiResource", () => {
  it("is loading, then ready with parsed data", async () => {
    api.mockResolvedValueOnce(reply(200, { n: 1 }));
    const { result } = renderHook(() => useApiResource("/v1/x", schema));
    expect(result.current[0]).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: "ready", data: { n: 1 } });
    });
  });

  it.each([
    [reply(401), "anonymous"],
    [reply(503), "error"],
    [reply(200, { n: "not a number" }), "error"]
  ])("maps a response to %s", async (response, status) => {
    api.mockResolvedValueOnce(response);
    const { result } = renderHook(() => useApiResource("/v1/x", schema));
    await waitFor(() => {
      expect(result.current[0].status).toBe(status);
    });
  });

  it("goes back to loading for a new version and ignores the stale answer", async () => {
    let resolveFirst: (r: Response) => void = () => undefined;
    api
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve))
      )
      .mockResolvedValueOnce(reply(200, { n: 2 }));
    const { result, rerender } = renderHook(
      ({ v }) => useApiResource("/v1/x", schema, v),
      {
        initialProps: { v: 0 }
      }
    );
    rerender({ v: 1 });
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: "ready", data: { n: 2 } });
    });
    await act(async () => {
      resolveFirst(reply(200, { n: 1 }));
      await Promise.resolve();
    });
    expect(result.current[0]).toEqual({ status: "ready", data: { n: 2 } });
  });

  it("lets a command replace the current value", async () => {
    api.mockResolvedValueOnce(reply(200, { n: 1 }));
    const { result } = renderHook(() => useApiResource("/v1/x", schema));
    await waitFor(() => {
      expect(result.current[0].status).toBe("ready");
    });
    act(() => {
      result.current[1]({ status: "ready", data: { n: 5 } });
    });
    expect(result.current[0]).toEqual({ status: "ready", data: { n: 5 } });
  });
});
