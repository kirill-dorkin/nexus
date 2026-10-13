import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

// Credentials are mounted by role; never bake or log them, or start the grader.
const mode = process.argv[2];
const commands = {
  api: ["apps/api/dist/main.js"],
  web: [
    "apps/web/node_modules/next/dist/bin/next",
    "start",
    "apps/web",
    "--port",
    "3000",
    "--hostname",
    "0.0.0.0"
  ],
  migrate: [
    "--import",
    "./packages/database/node_modules/tsx/dist/loader.mjs",
    "packages/database/src/cli/migrate.ts"
  ],
  payments: ["apps/worker/dist/payment-main.js"]
};
if (!Object.hasOwn(commands, mode))
  throw new Error("Unsupported runtime mode.");
const variable = {
  api: "DATABASE_URL",
  migrate: "DATABASE_MIGRATION_URL",
  payments: "DATABASE_WORKER_URL"
}[mode];
if (variable) {
  const file = process.env[`${variable}_FILE`];
  if (!file) throw new Error(`${variable}_FILE is required.`);
  const value = readFileSync(file, "utf8").trim();
  if (!value) throw new Error("Database secret is empty.");
  process.env[variable] = value;
}
if (mode === "api" || mode === "web") {
  const compiledOrigin = readFileSync(
    "infra/production/build-origin",
    "utf8"
  ).trim();
  if (process.env.WEB_APP_ORIGIN !== compiledOrigin) {
    throw new Error(
      "WEB_APP_ORIGIN must match the image's compiled HTTPS API origin."
    );
  }
  process.env.NEXT_PUBLIC_API_ORIGIN = compiledOrigin;
}
const child = spawn(process.execPath, commands[mode], {
  stdio: "inherit",
  env: process.env
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", () => {
  console.error("Runtime could not start.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
