import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const roots = ["apps/web/src", "packages/ui/src"];
const limit = 300;

function sources(dir: string): string[] {
  return readdirSync(path.join(repoRoot, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(relative);
      return /\.tsx?$/.test(entry.name) &&
        !/\.test(-utils)?\.|\.test\./.test(entry.name)
        ? [relative]
        : [];
    }
  );
}

describe("Web source size", () => {
  // Web quality phase 4b: a file over the limit is split by responsibility.
  it(`keeps every Web and UI source file at ${limit} lines or fewer`, () => {
    const oversized = roots
      .flatMap(sources)
      .map((file) => ({
        file,
        lines: readFileSync(path.join(repoRoot, file), "utf8")
          .trimEnd()
          .split("\n").length
      }))
      .filter(({ lines }) => lines > limit);
    expect(oversized).toEqual([]);
  });
});
