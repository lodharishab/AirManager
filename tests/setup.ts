import { beforeAll, afterEach, afterAll } from "vitest";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import pg from "pg";
import type { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../shared/schema";

const BASE_DB_URL = process.env.DATABASE_URL || "";
const TEST_DB_NAME = `airmanager_test_${process.pid}`;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let pool: Pool;
let db: NodePgDatabase<typeof schema>;

function assertTestEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run tests in production environment.");
  }
  const dbUrl = BASE_DB_URL;
  if (dbUrl.includes("prod") || dbUrl.includes("production")) {
    throw new Error("Refusing to run tests against a production database URL.");
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

async function recreateTestDatabase(admin: Pool) {
  await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
}

async function pushSchema() {
  execFileSync(path.join(REPO_ROOT, "node_modules/.bin/drizzle-kit"), ["push", "--force"], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: testDbUrl() },
    stdio: "pipe",
  });
}

async function publicTables(client: pg.PoolClient): Promise<string[]> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'session' ORDER BY tablename`,
  );
  return res.rows.map((r) => r.tablename);
}

let tablesForCleanup: string[] = [];

beforeAll(async () => {
  assertTestEnvironment();

  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await recreateTestDatabase(admin);
  } finally {
    await admin.end();
  }

  process.env.DATABASE_URL = testDbUrl();
  ({ pool, db } = await import("../server/db"));

  await pushSchema();

  const client = await pool.connect();
  try {
    tablesForCleanup = await publicTables(client);
  } finally {
    client.release();
  }
});

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
