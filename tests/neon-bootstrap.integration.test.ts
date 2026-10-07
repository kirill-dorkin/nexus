import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";
import {
  bootstrapRoles,
  assertRestrictedRoles
} from "../scripts/neon-bootstrap-core.mjs";

const require = createRequire(
  new URL("../packages/database/package.json", import.meta.url)
);
const { Client } = require("pg");
// Isolated resources in disposable local CI PostgreSQL only. Never read deployment credentials.
const adminUrl = new URL(
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
);
const prefix = `bootstrap_${randomBytes(8).toString("hex")}`;
const database = prefix;
const roles = {
  migrator: `${prefix}_migrator`,
  app: `${prefix}_app`,
  worker: `${prefix}_worker`
};
const urls = Object.fromEntries(
  Object.entries(roles).map(([kind, name]) => {
    const url = new URL(adminUrl);
    url.username = name;
    url.password = randomBytes(32).toString("base64url");
    url.pathname = `/${database}`;
    return [kind, url.href];
  })
);
const client = new Client({ connectionString: adminUrl.href });
const providerName = `${prefix}_provider_admin`;
const providerUrl = new URL(adminUrl);
providerUrl.username = providerName;
providerUrl.password = randomBytes(32).toString("base64url");
const provider = new Client({ connectionString: providerUrl.href });
let connected = false;
let providerConnected = false;

afterAll(async () => {
  if (!connected) return;
  if (providerConnected) await provider.end();
  await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  for (const name of Object.values(roles))
    await client.query(`DROP ROLE IF EXISTS "${name}"`);
  await client.query(`DROP ROLE IF EXISTS "${providerName}"`);
  await client.end();
});

describe("one-time managed PostgreSQL role bootstrap", () => {
  it("owns a new database with restricted roles, guards adoption and resumes without credential rotation", async () => {
    await client.connect();
    connected = true;
    await client.query(`CREATE ROLE "${providerName}" LOGIN PASSWORD '${providerUrl.password}'
      NOSUPERUSER CREATEDB CREATEROLE INHERIT NOBYPASSRLS NOREPLICATION`);
    await provider.connect();
    providerConnected = true;
    const bootstrap = (resume = false) =>
      bootstrapRoles({ client: provider, urls, database, roles, resume });
    await bootstrap();
    expect((await assertRestrictedRoles(client, roles)).sort()).toEqual(
      Object.values(roles).sort()
    );
    await expect(bootstrap()).rejects.toThrow("already exist");
    await bootstrap(true);
    const migrator = new Client({ connectionString: urls.migrator });
    await migrator.connect();
    try {
      await migrator.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
      await migrator.query("CREATE TABLE public.bootstrap_probe (id integer)");
      const owner = await migrator.query(
        "SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()"
      );
      expect(owner.rows[0].owner).toBe(roles.migrator);
    } finally {
      await migrator.end();
    }
    const app = new Client({ connectionString: urls.app });
    await app.connect();
    try {
      expect(
        (await app.query("SELECT current_user AS name")).rows[0].name
      ).toBe(roles.app);
      await expect(
        app.query("SELECT * FROM public.bootstrap_probe")
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        app.query("CREATE TABLE public.unauthorized (id integer)")
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        app.query(`SET ROLE "${roles.migrator}"`)
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      await app.end();
    }
    // Checkpoint resumption fails closed if an operator grants a runtime role broader access.
    await client.query(`ALTER ROLE "${roles.app}" CREATEDB`);
    await expect(bootstrap(true)).rejects.toThrow("Unsafe privileges");
  });
});
