import { afterEach, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "dotenv";
import { sql } from "drizzle-orm";
import pg from "pg";
import type { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../shared/schema";

let databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  try {
    databaseUrl = parse(readFileSync(".env")).DATABASE_URL || "";
  } catch {
    // The environment assertion below reports the actionable error.
  }
}
const BASE_DB_URL = databaseUrl;
const TEST_DB_NAME = `airmanager_test_${process.pid}`;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assertTestEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run tests in production environment.");
  }
  if (BASE_DB_URL.includes("prod") || BASE_DB_URL.includes("production")) {
    throw new Error("Refusing to run tests against a production database URL.");
  }
  if (!BASE_DB_URL) {
    throw new Error("DATABASE_URL must be set for integration tests.");
  }
}

function testDbUrl(): string {
  const u = new URL(BASE_DB_URL);
  u.pathname = `/${TEST_DB_NAME}`;
  return u.toString();
}

function adminUrl(): string {
  const u = new URL(BASE_DB_URL);
  u.pathname = "/postgres";
  return u.toString();
}

assertTestEnvironment();

// Provision at module top level: setup modules evaluate before test modules,
// so the DB URL must be final before the test's static imports create the pool.
const admin = new pg.Pool({ connectionString: adminUrl() });
await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
await admin.end();

process.env.DATABASE_URL = testDbUrl();
const { pool, db } = await import("../server/db");

execFileSync(path.join(REPO_ROOT, "node_modules/.bin/drizzle-kit"), ["push", "--force"], {
  cwd: REPO_ROOT,
  env: { ...process.env, DATABASE_URL: testDbUrl() },
  stdio: "pipe",
});

async function publicTables(client: pg.PoolClient): Promise<string[]> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'session' ORDER BY tablename`,
  );
  return res.rows.map((r) => r.tablename);
}

const client = await pool.connect();
const tablesForCleanup = await publicTables(client);
client.release();

afterEach(async () => {
  if (tablesForCleanup.length > 0) {
    const list = tablesForCleanup.map((t) => `"${t}"`).join(", ");
    await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
  }
});

afterAll(async () => {
  await pool.end();

  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
});
