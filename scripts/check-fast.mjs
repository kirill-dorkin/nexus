#!/usr/bin/env node
/*
 * The quick local gate before a push (owner decision 2026-11-06): it checks only what the branch
 * changed against origin/main — formatting, lint, the whole typecheck (cached by turbo), unit
 * tests related to the changed files, and the architecture rules. GitHub CI still runs the full
 * suite (`pnpm check` plus integration, build, browser and e2e) before anything merges.
 */
import { execFileSync, spawnSync } from "node:child_process";

const sh = (cmd, args) =>
  execFileSync(cmd, args, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

const base = sh("git", ["merge-base", "HEAD", "origin/main"])[0];
const changed = [
  ...sh("git", ["diff", "--name-only", "--diff-filter=ACMR", base]),
  ...sh("git", ["ls-files", "--others", "--exclude-standard"])
].filter((file, i, all) => all.indexOf(file) === i);

const code = changed.filter((f) => /\.(c|m)?(t|j)sx?$/.test(f));
const formattable = changed.filter((f) =>
  /\.(c|m)?(t|j)sx?$|\.(json|css|md|ya?ml)$/.test(f)
);

const steps = [
  ["brand isolation", "pnpm", ["check:brand"]],
  formattable.length > 0 && [
    "formatting",
    "pnpm",
    ["exec", "prettier", "--check", "--ignore-unknown", ...formattable]
  ],
  code.length > 0 && [
    "lint",
    "pnpm",
    ["exec", "eslint", "--max-warnings", "0", "--no-warn-ignored", ...code]
  ],
  ["typecheck", "pnpm", ["typecheck"]],
  code.length > 0 && [
    "related unit tests",
    "pnpm",
    ["exec", "vitest", "related", "--run", "--passWithNoTests", ...code]
  ],
  [
    "architecture rules",
    "pnpm",
    ["exec", "vitest", "run", "tests/architecture"]
  ]
].filter(Boolean);

console.log(
  `check:fast — ${changed.length} changed file(s) since ${base.slice(0, 7)}`
);
for (const [name, cmd, args] of steps) {
  console.log(`\n▶ ${name}`);
  const run = spawnSync(cmd, args, { stdio: "inherit" });
  if (run.status !== 0) {
    console.error(`\n✗ ${name} failed`);
    process.exit(run.status ?? 1);
  }
}
console.log("\n✓ check:fast passed — GitHub CI runs the full suite");
