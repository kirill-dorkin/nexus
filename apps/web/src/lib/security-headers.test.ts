import { afterEach, describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

// ADR-0069: the headers next.config.ts sends on every page.

type Rule = Awaited<ReturnType<NonNullable<typeof nextConfig.headers>>>[number];

const saved = process.env.NEXT_PUBLIC_API_ORIGIN;
afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
  else process.env.NEXT_PUBLIC_API_ORIGIN = saved;
});

async function rules(apiOrigin?: string): Promise<Rule[]> {
  if (apiOrigin === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
  else process.env.NEXT_PUBLIC_API_ORIGIN = apiOrigin;
  const headers = nextConfig.headers;
  if (headers === undefined) throw new Error("next.config.ts sends no headers");
  return await headers();
}

const policy = (rule: Rule | undefined) =>
  rule?.headers.find((header) => header.key === "Content-Security-Policy")
    ?.value ?? "";

const directive = (value: string, name: string) =>
  value
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("security headers", () => {
  it("cover every page, with a separate rule for the Paddle checkout", async () => {
    const [pages, checkout] = await rules("/");
    expect(pages?.source).toBe("/:path((?!checkout/paddle/).*)");
    expect(checkout?.source).toBe("/checkout/paddle/:path*");
  });

  it("forbid framing, plugins and foreign form targets", async () => {
    const value = policy((await rules("/"))[0]);
    expect(directive(value, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(value, "object-src")).toEqual(["'none'"]);
    expect(directive(value, "form-action")).toEqual(["'self'"]);
    expect(directive(value, "base-uri")).toEqual(["'self'"]);
    expect(directive(value, "script-src")).not.toContain("https:");
  });

  it("allow Paddle only on payment pages", async () => {
    const [pages, checkout] = await rules("/");
    expect(policy(pages)).not.toContain("paddle");
    expect(directive(policy(checkout), "script-src")).toContain(
      "https://cdn.paddle.com"
    );
    expect(directive(policy(checkout), "frame-ancestors")).toEqual(["'none'"]);
  });

  it("let the browser call a separate API origin, and nothing else", async () => {
    expect(
      directive(
        policy((await rules("https://api.example.test"))[0]),
        "connect-src"
      )
    ).toEqual(["'self'", "https://api.example.test"]);
    for (const value of ["/", "", "javascript:alert(1)", "not a url"])
      expect(directive(policy((await rules(value))[0]), "connect-src")).toEqual(
        ["'self'"]
      );
  });

  it("send the companion headers", async () => {
    const names = (await rules("/"))[0]?.headers.map((header) => header.key);
    expect(names).toEqual([
      "Content-Security-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "Permissions-Policy"
    ]);
  });
});
