#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const name = value("--name");
const slug = value("--slug");
const shortName = value("--short-name") ?? name;
const tagline = value("--tagline");

if (!name || !slug) {
  console.error(
    'Usage: pnpm rebrand --name "New Name" --slug "new-name" [--short-name "Name"] [--tagline "..."]'
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("--slug must be kebab-case ASCII");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const brandPath = path.resolve(here, "../packages/brand/brand.json");
const current = JSON.parse(await readFile(brandPath, "utf8"));
const next = {
  ...current,
  name,
  shortName,
  slug,
  ...(tagline ? { tagline } : {})
};

await writeFile(brandPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Brand updated: ${current.name} -> ${next.name}`);
console.log("Run `pnpm check:brand` and commit packages/brand/brand.json.");
