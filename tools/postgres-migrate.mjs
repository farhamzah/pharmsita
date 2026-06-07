import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(rootDir, "backend", "database", "migrations");
const migrationTable = "pharmsita_schema_migrations";

const usage = `Usage:
  npm.cmd run db:migrate:status
  npm.cmd run db:migrate
  npm.cmd run db:migrate -- --dry-run
  npm.cmd run db:migrate:baseline -- --confirm-baseline

Commands:
  status      Show applied and pending PostgreSQL migrations.
  up          Apply pending migrations in version order.
  baseline    Mark local migrations as applied without running SQL. Use only for an existing manually migrated database.

Options:
  --database-url <url>       PostgreSQL connection string. Defaults to DATABASE_URL.
  --ssl                      Enable PostgreSQL SSL with rejectUnauthorized=false.
  --no-ssl                   Disable PostgreSQL SSL.
  --lock-key <number>        Advisory lock key. Defaults to MIGRATION_ADVISORY_LOCK_KEY or 810098.
  --dry-run                  Show pending migrations without applying.
  --confirm-baseline         Required for baseline.
  --help                     Show this help.
`;

const parseArgs = (argv) => {
  const options = {
    command: "status",
    databaseUrl: process.env.DATABASE_URL || "",
    ssl:
      process.env.DATABASE_SSL &&
      ["1", "true", "yes", "on"].includes(process.env.DATABASE_SSL.toLowerCase()),
    lockKey: Number(process.env.MIGRATION_ADVISORY_LOCK_KEY || 810098),
    dryRun: false,
    confirmBaseline: false,
    help: false,
  };

  const args = [...argv];
  if (args[0] && !args[0].startsWith("--")) {
    options.command = args.shift();
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--ssl") {
      options.ssl = true;
    } else if (arg === "--no-ssl") {
      options.ssl = false;
    } else if (arg === "--lock-key") {
      options.lockKey = Number(args[++index]);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--confirm-baseline") {
      options.confirmBaseline = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["status", "up", "baseline"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }

  if (!Number.isInteger(options.lockKey)) {
    throw new Error("--lock-key must be an integer.");
  }

  return options;
};

const checksum = (sql) => crypto.createHash("sha256").update(sql).digest("hex");

const readMigrations = async () => {
  const filenames = (await fs.readdir(migrationsDir))
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  const migrations = [];
  const versions = new Set();

  for (const filename of filenames) {
    const version = filename.split("_")[0];

    if (versions.has(version)) {
      throw new Error(`Duplicate migration version detected: ${version}`);
    }

    versions.add(version);

    const filePath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(filePath, "utf8");
    migrations.push({
      version,
      filename,
      path: filePath,
      sql,
      checksum: checksum(sql),
    });
  }

  for (let index = 0; index < migrations.length; index += 1) {
    const expected = String(index + 1).padStart(3, "0");
    if (migrations[index].version !== expected) {
      throw new Error(
        `Migration version gap detected. Expected ${expected}, found ${migrations[index].filename}.`
      );
    }
  }

  return migrations;
};

const createPool = (options) => {
  if (!options.databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return new Pool({
    connectionString: options.databaseUrl,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  });
};

const ensureMigrationTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationTable} (
      version TEXT PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms INTEGER NOT NULL,
      applied_by TEXT NOT NULL DEFAULT CURRENT_USER
    )
  `);
};

const readAppliedMigrations = async (client) => {
  const result = await client.query(`
    SELECT version, filename, checksum, applied_at, duration_ms
    FROM ${migrationTable}
    ORDER BY version ASC
  `);

  return result.rows;
};

const validateAppliedState = (migrations, appliedRows) => {
  const localByVersion = new Map(migrations.map((migration) => [migration.version, migration]));

  for (const row of appliedRows) {
    const local = localByVersion.get(row.version);
    if (!local) {
      throw new Error(
        `Database has applied migration ${row.version} (${row.filename}) but no matching local file exists.`
      );
    }

    if (local.filename !== row.filename) {
      throw new Error(
        `Migration filename mismatch for version ${row.version}. Database=${row.filename}, local=${local.filename}.`
      );
    }

    if (local.checksum !== row.checksum) {
      throw new Error(
        `Migration checksum mismatch for ${row.filename}. Do not edit applied migrations; create a new migration instead.`
      );
    }
  }

  const appliedVersions = new Set(appliedRows.map((row) => row.version));
  const firstPendingIndex = migrations.findIndex((migration) => !appliedVersions.has(migration.version));

  if (firstPendingIndex >= 0) {
    const outOfOrderApplied = migrations
      .slice(firstPendingIndex + 1)
      .find((migration) => appliedVersions.has(migration.version));

    if (outOfOrderApplied) {
      throw new Error(
        `Migration order is invalid. ${outOfOrderApplied.filename} is applied while an earlier migration is pending.`
      );
    }
  }
};

const buildStatusRows = (migrations, appliedRows) => {
  const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]));

  return migrations.map((migration) => {
    const applied = appliedByVersion.get(migration.version);
    return {
      version: migration.version,
      filename: migration.filename,
      status: applied ? "applied" : "pending",
      appliedAt: applied?.applied_at?.toISOString?.() || "",
      durationMs: applied?.duration_ms ?? "",
    };
  });
};

const printStatus = (migrations, appliedRows) => {
  console.table(buildStatusRows(migrations, appliedRows));
};

const applyMigration = async (client, migration) => {
  const startedAt = Date.now();

  await client.query("BEGIN");
  try {
    await client.query(migration.sql);
    await client.query(
      `
        INSERT INTO ${migrationTable} (version, filename, checksum, duration_ms)
        VALUES ($1, $2, $3, $4)
      `,
      [migration.version, migration.filename, migration.checksum, Date.now() - startedAt]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const baselineMigrations = async (client, migrations, pendingMigrations) => {
  const startedAt = Date.now();

  await client.query("BEGIN");
  try {
    for (const migration of pendingMigrations) {
      await client.query(
        `
          INSERT INTO ${migrationTable} (version, filename, checksum, duration_ms, applied_by)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [migration.version, migration.filename, migration.checksum, Date.now() - startedAt, "baseline"]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const withAdvisoryLock = async (client, lockKey, callback) => {
  await client.query("SELECT pg_advisory_lock($1)", [lockKey]);
  try {
    return await callback();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    return;
  }

  const migrations = await readMigrations();
  const pool = createPool(options);
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    await withAdvisoryLock(client, options.lockKey, async () => {
      const appliedRows = await readAppliedMigrations(client);
      validateAppliedState(migrations, appliedRows);

      const appliedVersions = new Set(appliedRows.map((row) => row.version));
      const pendingMigrations = migrations.filter(
        (migration) => !appliedVersions.has(migration.version)
      );

      if (options.command === "status") {
        printStatus(migrations, appliedRows);
        console.log(`Applied: ${appliedRows.length}; Pending: ${pendingMigrations.length}`);
        return;
      }

      if (options.command === "baseline") {
        if (!options.confirmBaseline) {
          throw new Error("baseline requires --confirm-baseline.");
        }

        if (pendingMigrations.length === 0) {
          console.log("No pending migrations to baseline.");
          return;
        }

        await baselineMigrations(client, migrations, pendingMigrations);
        console.log(`Baselined ${pendingMigrations.length} migrations without running SQL.`);
        return;
      }

      if (pendingMigrations.length === 0) {
        console.log("Database schema is up to date.");
        return;
      }

      if (options.dryRun) {
        console.table(
          pendingMigrations.map((migration) => ({
            version: migration.version,
            filename: migration.filename,
            action: "would apply",
          }))
        );
        console.log(`Pending: ${pendingMigrations.length}`);
        return;
      }

      for (const migration of pendingMigrations) {
        const startedAt = Date.now();
        await applyMigration(client, migration);
        console.log(`Applied ${migration.filename} (${Date.now() - startedAt} ms)`);
      }

      console.log(`Applied ${pendingMigrations.length} migrations.`);
    });
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
