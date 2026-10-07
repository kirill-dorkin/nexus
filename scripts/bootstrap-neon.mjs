import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  bootstrapRoles,
  normalizeNeonAdminUrl,
  createRoleUrls,
  runtimeRoles,
  assertRestrictedRoles
} from "./neon-bootstrap-core.mjs";

const require = createRequire(
  new URL("../packages/database/package.json", import.meta.url)
);
const { Client } = require("pg");
const root = fileURLToPath(new URL("../", import.meta.url));
const privateDirectory = fileURLToPath(
  new URL("../.tmp/neon-bootstrap/", import.meta.url)
);
const checkpointPath = `${privateDirectory}credentials.json`;
const projectId = "prj_vAMrHEXEzkQ7vS1hFCWWr27HmUxw";
const storeId = "store_uujjS67D1HjjHrTs";
const scope = "bhvgfs-projects";
// dlx installs in isolation and needs its own explicit lifecycle-script allowlist.
const cli = ["dlx", "--allow-build=esbuild", "vercel@62.7.0"];
let adminUrl;

function vercel(args, options = {}) {
  const result = spawnSync("pnpm", [...cli, ...args, "--scope", scope], {
    cwd: root,
    stdio: "inherit",
    ...options
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Vercel CLI did not complete. If login is required, run pnpm dlx --allow-build=esbuild vercel@62.7.0 login and retry this command."
    );
  }
  return result;
}

function storageStatus() {
  const result = vercel(
    [
      "storage",
      "status",
      storeId,
      "--project",
      projectId,
      "--format",
      "json",
      "--non-interactive"
    ],
    {
      stdio: ["inherit", "pipe", "inherit"],
      encoding: "utf8"
    }
  );
  const stores = JSON.parse(result.stdout).stores;
  if (
    !Array.isArray(stores) ||
    stores.length !== 1 ||
    stores[0].id !== storeId
  ) {
    throw new Error(
      "Neon resource identity did not match. Nothing was changed."
    );
  }
  return stores[0];
}

async function hiddenUrl() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Run interactively in your terminal; credentials are accepted only by hidden input."
    );
  process.stdout.write(
    "Paste Neon DATABASE_URL_UNPOOLED (hidden), then press Enter: "
  );
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (data) => {
      for (const char of data) {
        if (char === "\u0003" || char === "\u0004") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function withClient(url, operation) {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 15000
  });
  try {
    await client.connect();
    return await operation(client);
  } finally {
    await client.end();
  }
}

try {
  // Verify the exact remote project before collecting credentials or making changes.
  const inspection = vercel(
    ["project", "inspect", projectId, "--format", "json", "--non-interactive"],
    {
      stdio: ["inherit", "pipe", "inherit"],
      encoding: "utf8"
    }
  );
  const project = JSON.parse(inspection.stdout);
  if (
    project.id !== projectId ||
    project.owner?.slug !== scope ||
    project.name !== "nexus"
  ) {
    throw new Error(
      "Vercel project identity did not match Nexus. Nothing was changed."
    );
  }
  storageStatus();
  adminUrl = normalizeNeonAdminUrl(await hiddenUrl());
  let checkpoint;
  try {
    checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const resume = checkpoint !== undefined;
  if (
    resume &&
    (checkpoint.version !== 1 || checkpoint.hostname !== adminUrl.hostname)
  ) {
    throw new Error(
      "Saved checkpoint belongs to another database endpoint. Nothing was changed."
    );
  }
  const urls = checkpoint?.urls ?? createRoleUrls(adminUrl, "platform");
  for (const [kind, name] of Object.entries(runtimeRoles)) {
    const url = new URL(urls[kind]);
    const expectedHost =
      kind === "app"
        ? adminUrl.hostname.replace(/^([^.]+)\./, "$1-pooler.")
        : adminUrl.hostname;
    if (
      url.hostname !== expectedHost ||
      url.pathname !== "/platform" ||
      url.username !== name ||
      !url.password ||
      url.searchParams.get("sslmode") !== "verify-full"
    ) {
      throw new Error("Invalid bootstrap checkpoint. Nothing was changed.");
    }
  }
  await withClient(adminUrl.href, async (client) => {
    // Verify saved credentials before resuming an operation on existing roles.
    if (resume) {
      const { rows } = await client.query(
        "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])",
        [Object.values(runtimeRoles)]
      );
      for (const { rolname } of rows) {
        const kind = Object.keys(runtimeRoles).find(
          (key) => runtimeRoles[key] === rolname
        );
        const verification = new URL(urls[kind]);
        verification.hostname = adminUrl.hostname;
        verification.pathname = adminUrl.pathname;
        await withClient(verification.href, async (savedClient) => {
          const {
            rows: [identity]
          } = await savedClient.query("SELECT current_user AS name");
          if (identity.name !== rolname)
            throw new Error("Saved role credentials did not match.");
        });
      }
    }
    await bootstrapRoles({
      client,
      urls,
      resume,
      beforeWrite: async () => {
        await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
        await chmod(privateDirectory, 0o700);
        if (!resume)
          await writeFile(
            checkpointPath,
            JSON.stringify({ version: 1, hostname: adminUrl.hostname, urls }),
            { flag: "wx", mode: 0o600 }
          );
      }
    });
  });
  adminUrl = undefined;
  await withClient(urls.migrator, async (client) => {
    await client.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    const names = await assertRestrictedRoles(client);
    if (names.length !== 3)
      throw new Error("Dedicated roles were not provisioned.");
  });
  // Only the established ordered/checksummed migrator applies schema changes.
  const migration = spawnSync("pnpm", ["db:migrate"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_MIGRATION_URL: urls.migrator }
  });
  if (migration.error || migration.status !== 0)
    throw new Error(
      "Migrations failed. Credentials were saved privately; retry after resolving the error."
    );
  await withClient(urls.app, async (client) => {
    const {
      rows: [role]
    } = await client.query(
      "SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user"
    );
    if (
      role.name !== runtimeRoles.app ||
      role.rolsuper ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.rolbypassrls
    )
      throw new Error("App-role verification failed.");
    await client.query("BEGIN");
    try {
      const {
        rows: [context]
      } = await client.query(
        "SELECT set_config('app.organization_id', '', true) AS organization_id"
      );
      if (context.organization_id !== "")
        throw new Error("Transaction-local context verification failed.");
    } finally {
      await client.query("ROLLBACK");
    }
  });
  // Secret reaches the CLI over stdin, never a command argument or console output.
  vercel(
    [
      "env",
      "add",
      "DATABASE_URL",
      "production",
      "--project",
      projectId,
      "--type",
      "secret",
      "--force",
      "--yes",
      "--non-interactive"
    ],
    {
      input: urls.app,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"]
    }
  );
  if (storageStatus().connections.length) {
    console.log(
      "Disconnect the Marketplace owner variables when prompted. This keeps the Neon database and the separate app-role DATABASE_URL."
    );
    vercel(["storage", "disconnect", storeId, "--project", projectId]);
    if (storageStatus().connections.length)
      throw new Error(
        "Owner-variable disconnection was cancelled. Do not deploy until the bootstrap finishes."
      );
  }
  console.log(
    "PostgreSQL 18 bootstrap, migrations and pooled app-role verification passed."
  );
  console.log(
    "Only app-role DATABASE_URL was saved in Vercel Production. No deployment was started."
  );
  console.log(
    "Keep the private .tmp/neon-bootstrap/credentials.json in your password manager; do not commit or share it."
  );
} catch (error) {
  // URL parsing/network errors can contain a URL. Do not print credential-bearing errors.
  const message = String(error.message).replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    "[database URL redacted]"
  );
  console.error(`Bootstrap stopped: ${message}`);
  process.exitCode = 1;
}
