import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OWNER } from "./fixtures/accounts";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

/**
 * Publishes the e2e course the way operators publish real ones: migrations,
 * owner account, owner organization, manifest, publication, public offering.
 * Every step is idempotent, so a reused local database is fine.
 */
export default function globalSetup() {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/launch-course.mjs",
      "tests/e2e/fixtures/e2e-course.manifest.json",
      "--origin",
      "http://localhost:3000",
      "--org-slug",
      "nexus",
      "--org-name",
      "Nexus",
      // A reused local database keeps the first published fixture; set
      // E2E_REPUBLISH=1 after changing the fixture to publish it as a new version.
      ...(process.env.E2E_REPUBLISH === "1" ? ["--new-version"] : [])
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_MIGRATION_URL:
          process.env.DATABASE_MIGRATION_URL ??
          "postgresql://platform_migrator:platform_migrator@127.0.0.1:5432/platform_e2e",
        OWNER_EMAIL: OWNER.email,
        OWNER_PASSWORD: OWNER.password
      }
    }
  );
  if (result.status !== 0) {
    throw new Error(
      `Publishing the e2e course failed:\n${result.stdout}\n${result.stderr}`
    );
  }
}
