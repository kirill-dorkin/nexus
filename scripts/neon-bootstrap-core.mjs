import { randomBytes } from "node:crypto";

export const runtimeRoles = {
  migrator: "platform_migrator",
  app: "platform_app",
  worker: "platform_worker"
};

export function normalizeNeonAdminUrl(raw) {
  const url = new URL(raw.trim());
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname) ||
    url.hostname.split(".")[0].endsWith("-pooler") ||
    (url.port && url.port !== "5432") ||
    !url.username ||
    !url.password ||
    !/^\/[a-zA-Z0-9_]+$/.test(url.pathname) ||
    url.hash ||
    [...url.searchParams.keys()].some(
      (key) => !["sslmode", "channel_binding"].includes(key)
    )
  ) {
    throw new Error(
      "Use the direct DATABASE_URL_UNPOOLED from this Neon project, not a pooled URL or a shell command."
    );
  }
  url.searchParams.set("sslmode", "verify-full");
  return url;
}

export function createRoleUrls(adminUrl, database, roles = runtimeRoles) {
  return Object.fromEntries(
    Object.entries(roles).map(([kind, name]) => {
      const url = new URL(adminUrl);
      url.username = name;
      url.password = randomBytes(32).toString("base64url");
      url.pathname = `/${database}`;
      if (kind === "app") {
        const [endpoint, ...domain] = url.hostname.split(".");
        url.hostname = `${endpoint}-pooler.${domain.join(".")}`;
      }
      return [kind, url.href];
    })
  );
}

const identifier = (value) => {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value))
    throw new Error("Invalid bootstrap resource name.");
  return `"${value}"`;
};
const literal = (value) => `'${value.replaceAll("'", "''")}'`;

export async function assertRestrictedRoles(client, roles = runtimeRoles) {
  const names = Object.values(roles);
  const result = await client.query(
    `
    SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
      rolinherit, rolbypassrls, rolreplication,
      EXISTS(SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS has_membership
    FROM pg_roles WHERE rolname = ANY($1::text[])
  `,
    [names]
  );
  for (const role of result.rows) {
    if (
      !role.rolcanlogin ||
      role.rolsuper ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.rolinherit ||
      role.rolbypassrls ||
      role.rolreplication ||
      role.has_membership
    ) {
      throw new Error(
        `Unsafe privileges or membership on ${role.rolname}; refusing to continue.`
      );
    }
  }
  return result.rows.map((role) => role.rolname);
}

// One-time infrastructure operation. Never imported by a deployed service.
// A checkpoint is saved only after the existing-resource guard, before any writes.
export async function bootstrapRoles({
  client,
  urls,
  database = "platform",
  roles = runtimeRoles,
  resume = false,
  beforeWrite = async () => {}
}) {
  const db = identifier(database);
  Object.values(roles).forEach(identifier);
  const {
    rows: [admin]
  } = await client.query(`
    SELECT current_setting('server_version_num') AS version, current_user AS name,
      rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user
  `);
  if (
    Math.trunc(Number(admin.version) / 10000) !== 18 ||
    !admin.rolcreatedb ||
    !admin.rolcreaterole
  ) {
    throw new Error(
      "Bootstrap requires PostgreSQL 18 and an admin role with CREATEDB/CREATEROLE."
    );
  }
  const existing = await assertRestrictedRoles(client, roles);
  const {
    rows: [existingDatabase]
  } = await client.query(
    "SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1",
    [database]
  );
  if (!resume && (existing.length || existingDatabase)) {
    throw new Error(
      "Bootstrap resources already exist without this command's checkpoint. Refusing to adopt or rotate existing credentials."
    );
  }
  if (existingDatabase && existingDatabase.owner !== roles.migrator) {
    throw new Error(
      "Database owner differs from the dedicated migrator; refusing to continue."
    );
  }
  await beforeWrite();
  await client.query("BEGIN");
  try {
    for (const [kind, name] of Object.entries(roles)) {
      if (!existing.includes(name)) {
        const password = decodeURIComponent(new URL(urls[kind]).password);
        await client.query(`CREATE ROLE ${identifier(name)} LOGIN PASSWORD ${literal(password)}
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION`);
      }
    }
    // Neon admins need SET ROLE membership to assign a new database owner.
    const adminName = `"${admin.name.replaceAll('"', '""')}"`;
    await client.query(`GRANT ${identifier(roles.migrator)} TO ${adminName}`);
    await assertRestrictedRoles(client, roles);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  if (!existingDatabase)
    await client.query(
      `CREATE DATABASE ${db} OWNER ${identifier(roles.migrator)}`
    );
  await client.query(`SET ROLE ${identifier(roles.migrator)}`);
  try {
    await client.query(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`);
    await client.query(
      `GRANT CONNECT ON DATABASE ${db} TO ${identifier(roles.app)}, ${identifier(roles.worker)}`
    );
    await client.query(`ALTER DATABASE ${db} SET timezone TO 'UTC'`);
  } finally {
    await client.query("RESET ROLE");
  }
}
