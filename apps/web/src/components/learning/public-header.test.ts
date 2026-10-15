import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const here = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("shared public/learner header", () => {
  it("uses one header component on home and all LearningShell pages", () => {
    const home = here("./home-discovery.tsx");
    const learning = here("./learning-shell.tsx");
    expect(home).toContain("<PublicHeader className={styles.header} />");
    expect(learning).toContain("<PublicHeader />");
    expect(home).not.toContain("appearanceDock");
    expect(learning).not.toContain("appearanceRow");
  });

  it("keeps theme and appearance inside the header on an opaque semantic surface", () => {
    const header = here("./public-header.tsx");
    const styles = here("./learning.module.css");
    expect(header).toContain("<AppearanceControl compact />");
    const block = styles.match(/\\.nav\\s*\\{([^}]+)\\}/)?.[1];
    expect(block).toBeDefined();
    expect(block).toContain("background: var(--surface-default)");
    expect(block).toContain("color: var(--text-primary)");
    expect(block).not.toContain("backdrop-filter");
    expect(styles).not.toContain(".appearanceRow");
  });

  it("does not put Studio in public footers", () => {
    expect(here("./home-discovery.tsx")).not.toContain('href="/studio"');
    expect(here("./learning-shell.tsx")).not.toContain('href="/studio"');
  });
});
