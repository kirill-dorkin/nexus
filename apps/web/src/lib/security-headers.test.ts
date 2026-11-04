import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("security headers", () => {
  it("forbids framing, plugins and foreign form targets", () => {
    const policy = contentSecurityPolicy();
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
  });

  it("loads scripts and data only from the site itself", () => {
    const policy = contentSecurityPolicy();
    expect(directive(policy, "script-src")).not.toContain("https:");
    expect(directive(policy, "connect-src")).toEqual(["'self'"]);
  });

  it("allows Paddle only on payment pages", () => {
    expect(contentSecurityPolicy()).not.toContain("paddle");
    const payments = contentSecurityPolicy({ payments: true });
    expect(directive(payments, "script-src")).toContain(
      "https://cdn.paddle.com"
    );
    expect(directive(payments, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("sends the companion headers", () => {
    const names = securityHeaders().map((header) => header.key);
    expect(names).toEqual([
      "Content-Security-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "Permissions-Policy"
    ]);
  });
});
