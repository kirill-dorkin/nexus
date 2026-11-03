import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readMigrations,
  validateMigrationHistory,
  type MigrationFile
} from "./migrator";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "platform-migrations-"));
  temporaryDirectories.push(directory);
  return directory;
}

function migration(name: string, checksum = `${name}-checksum`): MigrationFile {
  return {
    name,
    checksum,
    sql: "SELECT 1;\n"
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("migration discovery", () => {
  it("sorts migrations and produces stable checksums", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, "000002_second.sql"), "SELECT 2;\n");
    await writeFile(path.join(directory, "000001_first.sql"), "SELECT 1;\n");

    const firstRead = await readMigrations(directory);
    const secondRead = await readMigrations(directory);

    expect(firstRead.map((migration) => migration.name)).toEqual([
      "000001_first.sql",
      "000002_second.sql"
    ]);
    expect(firstRead.map((migration) => migration.checksum)).toEqual(
      secondRead.map((migration) => migration.checksum)
    );
  });

  it("rejects migration filenames outside the ordered convention", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, "initial.sql"), "SELECT 1;\n");

    await expect(readMigrations(directory)).rejects.toThrow(
      /Invalid migration filename/
    );
  });

  it("rejects duplicate migration sequence numbers", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, "000001_first.sql"), "SELECT 1;\n");
    await writeFile(path.join(directory, "000001_second.sql"), "SELECT 2;\n");

    await expect(readMigrations(directory)).rejects.toThrow(
      /Duplicate migration sequence/
    );
  });

  it("rejects empty migrations", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, "000001_empty.sql"), "\n");

    await expect(readMigrations(directory)).rejects.toThrow(/is empty/);
  });
});

describe("migration history validation", () => {
  it("accepts an exact applied prefix", () => {
    const first = migration("000001_first.sql");
    const second = migration("000002_second.sql");

    expect(() =>
      validateMigrationHistory(
        [first, second],
        new Map([[first.name, first.checksum]])
      )
    ).not.toThrow();
  });

  it("rejects a migration inserted before applied history", () => {
    const inserted = migration("000001_inserted.sql");
    const appliedMigration = migration("000002_applied.sql");

    expect(() =>
      validateMigrationHistory(
        [inserted, appliedMigration],
        new Map([[appliedMigration.name, appliedMigration.checksum]])
      )
    ).toThrow(/not an exact prefix/);
  });
});
