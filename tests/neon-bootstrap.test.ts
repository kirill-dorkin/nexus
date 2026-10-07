import { describe, expect, it } from "vitest";
import {
  normalizeNeonAdminUrl,
  createRoleUrls
} from "../scripts/neon-bootstrap-core.mjs";

const direct =
  "postgresql://neondb_owner:example@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("Neon bootstrap connection boundary", () => {
  it("verifies TLS and separates pooled app credentials from direct migration/worker credentials", () => {
    const admin = normalizeNeonAdminUrl(direct);
    const urls = createRoleUrls(admin, "platform");
    const app = new URL(urls.app);
    const migrator = new URL(urls.migrator);
    const worker = new URL(urls.worker);
    expect(app.hostname).toBe("ep-example-pooler.us-east-1.aws.neon.tech");
    expect(migrator.hostname).toBe(admin.hostname);
    expect(worker.hostname).toBe(admin.hostname);
    expect([app.username, migrator.username, worker.username]).toEqual([
      "platform_app",
      "platform_migrator",
      "platform_worker"
    ]);
    expect(
      new Set([app.password, migrator.password, worker.password]).size
    ).toBe(3);
    for (const url of [app, migrator, worker]) {
      expect(url.pathname).toBe("/platform");
      expect(url.searchParams.get("sslmode")).toBe("verify-full");
      expect(url.password.length).toBeGreaterThanOrEqual(43);
      expect(url.password).not.toBe(admin.password);
    }
  });
  it.each([
    direct.replace("ep-example.", "ep-example-pooler."),
    direct.replace(".neon.tech", ".neon.tech.attacker.example"),
    direct.replace("postgresql:", "https:"),
    direct.replace("/neondb?", "/neondb/other?"),
    direct.replace("neondb_owner:example", "neondb_owner"),
    direct.replace("/neondb?", ":6543/neondb?"),
    `${direct}&options=-c%20role%3Dneon_superuser`,
    `${direct}&sslrootcert=/unexpected/file`,
    `${direct}#fragment`,
    `psql '${direct}'`
  ])("rejects unsafe or incorrect admin input", (input) => {
    expect(() => normalizeNeonAdminUrl(input)).toThrow();
  });
});
