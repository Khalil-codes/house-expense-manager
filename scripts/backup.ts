// Snapshot every house_expense_manager table to a timestamped JSON file.
// Usage:
//   pnpm db:backup            write scripts/backups/backup-<timestamp>.json
// Reads the live DB as-is (all tables + columns), so it works before or after
// any schema migration. Requires DATABASE_URL (loaded via --env-file=.env).

import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const sql = neon(process.env.DATABASE_URL!);
const TABLE_PREFIX = "house_expense_manager";

interface Backup {
  takenAt: string;
  database: string;
  tables: Record<string, unknown[]>;
}

async function listTables(): Promise<string[]> {
  const rows = (await sql.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE $1
     ORDER BY table_name`,
    [`${TABLE_PREFIX}%`]
  )) as { table_name: string }[];
  return rows.map((r) => r.table_name);
}

async function main() {
  const tableNames = await listTables();
  if (tableNames.length === 0) {
    throw new Error(`No tables found with prefix "${TABLE_PREFIX}".`);
  }

  const tables: Record<string, unknown[]> = {};
  for (const name of tableNames) {
    const rows = (await sql.query(`SELECT * FROM "${name}"`)) as unknown[];
    tables[name] = rows;
    console.log(`${name.padEnd(48)} ${rows.length} row(s)`);
  }

  const takenAt = new Date().toISOString();
  const backup: Backup = {
    takenAt,
    database: new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, ""),
    tables,
  };

  const dir = join(process.cwd(), "scripts", "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `backup-${takenAt.replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));

  const total = Object.values(tables).reduce((n, r) => n + r.length, 0);
  console.log(
    `\nBacked up ${tableNames.length} table(s), ${total} row(s) total.`
  );
  console.log(`Snapshot written to ${file}\n`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
