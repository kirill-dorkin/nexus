import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(new URL("./secrets/", import.meta.url));
// Refuse to replace an existing deployment's credentials or database identity.
mkdirSync(directory, { mode: 0o700 });
for (const role of ["admin", "app", "migration", "worker"]) {
  const password = randomBytes(48).toString("base64url");
  writeFileSync(`${directory}database-${role}-password`, password, {
    flag: "wx",
    mode: 0o444
  });
  if (role !== "admin") {
    const user = {
      app: "platform_app",
      migration: "platform_migrator",
      worker: "platform_worker"
    }[role];
    writeFileSync(
      `${directory}database-${role}-url`,
      `postgresql://${user}:${password}@postgres:5432/platform`,
      { flag: "wx", mode: 0o444 }
    );
  }
}
console.log("Created role secrets in protected directory; no values printed.");
