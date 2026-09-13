import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PackageManifest = {
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  scarfSettings?: {
    enabled?: boolean;
  };
};

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

async function readJson<T>(relativePath: string): Promise<T> {
  const content = await readFile(path.join(repoRoot, relativePath), "utf8");
  return JSON.parse(content) as T;
}

async function workspaceManifests(): Promise<Array<{ path: string; manifest: PackageManifest }>> {
  const manifests: Array<{ path: string; manifest: PackageManifest }> = [];

  for (const workspaceRoot of ["apps", "packages"]) {
    const entries = await readdir(path.join(repoRoot, workspaceRoot), {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const relativePath = path.join(workspaceRoot, entry.name, "package.json");

      try {
        manifests.push({
          path: relativePath,
          manifest: await readJson<PackageManifest>(relativePath)
        });
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw error;
      }
    }
  }

  return manifests;
}

describe("repository engineering policy", () => {
  it("pins the reviewed pnpm line and opts out of Scarf install analytics", async () => {
    const root = await readJson<PackageManifest>("package.json");

    expect(root.packageManager).toBe("pnpm@10.34.5");
    expect(root.scarfSettings?.enabled).toBe(false);
  });

  it("fails dependency installation on unreviewed lifecycle scripts", async () => {
    const workspace = await readFile(
      path.join(repoRoot, "pnpm-workspace.yaml"),
      "utf8"
    );

    expect(workspace).toContain("strictDepBuilds: true");
    expect(workspace).toContain("esbuild: true");
    expect(workspace).toContain('"@scarf/scarf": false');
  });

  it("contains no placeholder tests that report success without assertions", async () => {
    const manifests = await workspaceManifests();

    for (const { path: manifestPath, manifest } of manifests) {
      expect(
        manifest.scripts?.test ?? "",
        `${manifestPath} must not contain a fake test script`
      ).not.toMatch(/process\.exit\(0\)/);
    }
  });
});
