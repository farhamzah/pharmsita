import pg from "pg";
import { hashPassword } from "./lib/password-hash.mjs";

const { Pool } = pg;

const usage = `Usage:
  $env:PHARMSITA_BOOTSTRAP_PASSWORD="temporary-password"; npm.cmd run db:bootstrap-admin
  npm.cmd run db:bootstrap-admin -- --identifier superadmin --email admin@example.ac.id
  npm.cmd run db:bootstrap-admin -- --reset-password

Options:
  --database-url <url>        PostgreSQL connection string. Defaults to DATABASE_URL.
  --ssl                       Enable PostgreSQL SSL with rejectUnauthorized=false.
  --no-ssl                    Disable PostgreSQL SSL.
  --identifier <value>        Admin login identifier. Default: superadmin.
  --name <value>              Admin display name. Default: Super Admin PharmSITA.
  --email <value>             Admin email. Default: PHARMSITA_BOOTSTRAP_EMAIL or null.
  --employee-number <value>   Admin employee number. Default: SUPERADMIN-001.
  --password <value>          Temporary password. Prefer PHARMSITA_BOOTSTRAP_PASSWORD env.
  --reset-password            Reset password for an existing bootstrap admin.
  --dry-run                   Roll back after validating the operation.
  --help                      Show this help.
`;

const parseArgs = (argv) => {
  const options = {
    databaseUrl: process.env.DATABASE_URL || "",
    ssl:
      process.env.DATABASE_SSL &&
      ["1", "true", "yes", "on"].includes(process.env.DATABASE_SSL.toLowerCase()),
    identifier: process.env.PHARMSITA_BOOTSTRAP_IDENTIFIER || "superadmin",
    name: process.env.PHARMSITA_BOOTSTRAP_NAME || "Super Admin PharmSITA",
    email: process.env.PHARMSITA_BOOTSTRAP_EMAIL || null,
    employeeNumber: process.env.PHARMSITA_BOOTSTRAP_EMPLOYEE_NUMBER || "SUPERADMIN-001",
    password: process.env.PHARMSITA_BOOTSTRAP_PASSWORD || process.env.PHARMSITA_PASSWORD || "",
    resetPassword: false,
    dryRun: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--ssl") {
      options.ssl = true;
    } else if (arg === "--no-ssl") {
      options.ssl = false;
    } else if (arg === "--identifier") {
      options.identifier = args[++index] || "";
    } else if (arg === "--name") {
      options.name = args[++index] || "";
    } else if (arg === "--email") {
      options.email = args[++index] || null;
    } else if (arg === "--employee-number") {
      options.employeeNumber = args[++index] || "";
    } else if (arg === "--password") {
      options.password = args[++index] || "";
    } else if (arg === "--reset-password") {
      options.resetPassword = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.identifier = options.identifier.trim();
  options.name = options.name.trim();
  options.email = options.email ? options.email.trim() : null;
  options.employeeNumber = options.employeeNumber.trim();

  return options;
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

const validateOptions = (options, existingUser) => {
  if (!options.identifier) {
    throw new Error("--identifier is required.");
  }

  if (!options.name) {
    throw new Error("--name is required.");
  }

  if (!options.employeeNumber) {
    throw new Error("--employee-number is required.");
  }

  if (!existingUser || options.resetPassword) {
    if (!options.password) {
      throw new Error(
        "Temporary password is required. Set PHARMSITA_BOOTSTRAP_PASSWORD or pass --password."
      );
    }

    if (options.password.length < 8) {
      throw new Error("Temporary password must be at least 8 characters.");
    }
  }
};

const assertRequiredSchema = async (client) => {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `,
    [["users", "user_roles", "admin_profiles"]]
  );

  const existingTables = new Set(result.rows.map((row) => row.table_name));
  const missing = ["users", "user_roles", "admin_profiles"].filter(
    (tableName) => !existingTables.has(tableName)
  );

  if (missing.length > 0) {
    throw new Error(
      `Required tables are missing: ${missing.join(", ")}. Run npm.cmd run db:migrate first.`
    );
  }
};

const findExistingUser = async (client, identifier) => {
  const result = await client.query(
    "SELECT id, identifier, name, email FROM users WHERE identifier = $1",
    [identifier]
  );
  return result.rows[0] || null;
};

const upsertBootstrapAdmin = async (client, options, existingUser) => {
  const now = new Date();
  let userId = existingUser?.id || null;
  let action = existingUser ? "updated" : "created";

  if (!existingUser) {
    const result = await client.query(
      `
        INSERT INTO users (
          role,
          identifier,
          name,
          email,
          status,
          password_hash,
          password_status,
          force_change_on_login,
          created_at
        )
        VALUES ('admin', $1, $2, $3, 'Aktif', $4, 'needs_activation', TRUE, $5)
        RETURNING id
      `,
      [options.identifier, options.name, options.email, hashPassword(options.password), now]
    );
    userId = result.rows[0].id;
  } else {
    const passwordUpdate = options.resetPassword
      ? `,
          password_hash = $5,
          password_status = 'needs_activation',
          force_change_on_login = TRUE`
      : "";

    const values = options.resetPassword
      ? [options.name, options.email, now, existingUser.id, hashPassword(options.password)]
      : [options.name, options.email, now, existingUser.id];

    await client.query(
      `
        UPDATE users
        SET
          role = 'admin',
          name = $1,
          email = COALESCE($2, email),
          status = 'Aktif',
          updated_at = $3
          ${passwordUpdate}
        WHERE id = $4
      `,
      values
    );
    action = options.resetPassword ? "updated_with_password_reset" : "updated_without_password_reset";
  }

  await client.query(
    `
      INSERT INTO user_roles (user_id, role, status, created_at, updated_at)
      VALUES ($1, 'admin', 'Aktif', $2, $2)
      ON CONFLICT (user_id, role) DO UPDATE
      SET status = 'Aktif', updated_at = EXCLUDED.updated_at
    `,
    [userId, now]
  );

  await client.query(
    `
      INSERT INTO admin_profiles (
        user_id,
        employee_number,
        divisi,
        tingkat_akses,
        cakupan_akses,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        'Administrasi PharmSITA',
        'Superadmin',
        $3::JSONB,
        $4,
        $4
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        employee_number = EXCLUDED.employee_number,
        divisi = EXCLUDED.divisi,
        tingkat_akses = EXCLUDED.tingkat_akses,
        cakupan_akses = EXCLUDED.cakupan_akses,
        updated_at = EXCLUDED.updated_at
    `,
    [
      userId,
      options.employeeNumber,
      JSON.stringify(["Manajemen Akun", "Master Data", "Audit Log"]),
      now,
    ]
  );

  return { action, userId };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    return;
  }

  const pool = createPool(options);
  const client = await pool.connect();

  try {
    await assertRequiredSchema(client);
    const existingUser = await findExistingUser(client, options.identifier);
    validateOptions(options, existingUser);

    await client.query("BEGIN");
    try {
      const result = await upsertBootstrapAdmin(client, options, existingUser);

      if (options.dryRun) {
        await client.query("ROLLBACK");
        console.log("Dry run completed. No database changes were committed.");
      } else {
        await client.query("COMMIT");
      }

      console.log(
        JSON.stringify(
          {
            status: options.dryRun ? "dry_run" : "ok",
            action: result.action,
            identifier: options.identifier,
            userId: result.userId,
            requiresFirstLogin: !existingUser || options.resetPassword,
          },
          null,
          2
        )
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
