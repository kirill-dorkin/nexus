import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// AGENTS.md / ADR-0001: a module does not reach into another module's
// repository, tables or infrastructure. It may use another module's public
// application interface (queries, commands, ports, application services),
// its domain types and its Nest module.

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const modulesRoot = "apps/api/src/modules";

function sources(dir: string): string[] {
  return readdirSync(path.join(repoRoot, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(relative);
      return entry.name.endsWith(".ts") && !entry.name.includes(".test.")
        ? [relative]
        : [];
    }
  );
}

const moduleOf = (file: string) =>
  path.relative(modulesRoot, file).split(path.sep)[0] ?? "";

/** The part of an import inside another module that is not public, or null. */
export function forbiddenImport(
  file: string,
  specifier: string
): string | null {
  if (!specifier.startsWith(".")) return null;
  const target = path.normalize(path.join(path.dirname(file), specifier));
  if (!target.startsWith(modulesRoot + path.sep)) return null;
  const owner = moduleOf(target);
  if (owner === moduleOf(file)) return null;
  const inside = path.relative(path.join(modulesRoot, owner), target);
  const isPublic =
    (inside.startsWith(`application${path.sep}`) &&
      !inside.endsWith(".repository")) ||
    inside.startsWith(`domain${path.sep}`) ||
    inside.endsWith(".module");
  return isPublic ? null : `${owner}/${inside}`;
}

function violations(): string[] {
  return sources(modulesRoot).flatMap((file) => {
    const text = readFileSync(path.join(repoRoot, file), "utf8");
    return [...text.matchAll(/from\s+"([^"]+)"/g)].flatMap((match) => {
      const forbidden = forbiddenImport(file, match[1] ?? "");
      return forbidden ? [`${file} → ${forbidden}`] : [];
    });
  });
}

describe("API module boundaries", () => {
  it("uses only other modules' application interfaces, domain types and Nest modules", () => {
    expect(violations()).toEqual([]);
  });

  it("recognises a reach into another module's repository or infrastructure", () => {
    const file = `${modulesRoot}/projects/application/example.ts`;
    expect(
      forbiddenImport(
        file,
        "../../integrations/infrastructure/postgres-x.repository"
      )
    ).toBe("integrations/infrastructure/postgres-x.repository");
    expect(
      forbiddenImport(
        file,
        "../../integrations/application/github-x.repository"
      )
    ).toBe("integrations/application/github-x.repository");
    expect(
      forbiddenImport(file, "../../integrations/application/github-x.port")
    ).toBeNull();
    expect(
      forbiddenImport(file, "../../integrations/integrations.module")
    ).toBeNull();
    expect(forbiddenImport(file, "./own.repository")).toBeNull();
    expect(forbiddenImport(file, "@platform/contracts")).toBeNull();
  });
});
