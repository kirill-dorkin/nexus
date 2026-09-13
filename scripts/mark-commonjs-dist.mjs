import { writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = process.argv[2];

if (distDirectory === undefined || distDirectory.trim().length === 0) {
  throw new Error("A dist directory argument is required.");
}

const packageFile = path.resolve(process.cwd(), distDirectory, "package.json");
await writeFile(packageFile, '{\n  "type": "commonjs"\n}\n', "utf8");
