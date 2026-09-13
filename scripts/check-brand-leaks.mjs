#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const brandPath = path.join(root, "packages/brand/brand.json");
const brand = JSON.parse(await readFile(brandPath, "utf8"));
const needles = [brand.name, brand.slug].filter((v) => typeof v === "string" && v.length >= 3);
const roots = ["apps", "infra"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".yml", ".yaml", ".sql", ".sh", ".css"]);
const findings = [];

async function walk(relative) {
  const absolute = path.join(root, relative);
  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", "dist", ".next"].includes(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (extensions.has(path.extname(entry.name))) {
      const text = await readFile(path.join(root, child), "utf8");
      for (const needle of needles) {
        if (text.toLowerCase().includes(needle.toLowerCase())) findings.push(`${child}: ${needle}`);
      }
    }
  }
}

for (const relative of roots) {
  try { await walk(relative); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (findings.length) {
  console.error("Brand literals found outside the brand package:\n" + findings.join("\n"));
  process.exit(1);
}

console.log("Brand isolation check passed.");
