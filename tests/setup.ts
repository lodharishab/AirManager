import { beforeAll, afterEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { pool, db } from "../server/db";

const TEST_SCHEMA = `test_run_${Date.now()}`;

function assertTestEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run tests in production environment.");
  }
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.includes("prod") || dbUrl.includes("production")) {
    throw new Error("Refusing to run tests against a production database URL.");
  }
}

async function setSearchPath(client: ReturnType<Awaited<ReturnType<typeof pool.connect>>>) {
  await client.query(`SET search_path TO "${TEST_SCHEMA}", public`);
}

beforeAll(async () => {
  assertTestEnvironment();

  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${TEST_SCHEMA}"`);
    await setSearchPath(client);

    const tablesDDL = `
      CREATE TABLE "${TEST_SCHEMA}".users (
        id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".properties (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL,
        nightly_rate INTEGER NOT NULL, image_url TEXT, status TEXT NOT NULL DEFAULT 'active',
        occupancy_rate INTEGER NOT NULL DEFAULT 0, monthly_revenue INTEGER NOT NULL DEFAULT 0,
        description TEXT, property_type TEXT DEFAULT 'apartment', bedrooms INTEGER DEFAULT 1,
        bathrooms INTEGER DEFAULT 1, max_guests INTEGER DEFAULT 2, square_feet INTEGER,
        amenities TEXT[], check_in_time TEXT DEFAULT '14:00', check_out_time TEXT DEFAULT '11:00',
        minimum_stay INTEGER DEFAULT 1, house_rules TEXT, neighborhood TEXT,
        booking_mode TEXT NOT NULL DEFAULT 'whole', deleted_at TEXT
      );
      CREATE TABLE "${TEST_SCHEMA}".rooms (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        room_type TEXT NOT NULL, room_count INTEGER NOT NULL, nightly_rate INTEGER NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".property_links (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        label TEXT NOT NULL, url TEXT NOT NULL, link_type TEXT NOT NULL DEFAULT 'other'
      );
      CREATE TABLE "${TEST_SCHEMA}".bookings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        guest_name TEXT NOT NULL, check_in TEXT NOT NULL, check_out TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming', total_amount INTEGER NOT NULL,
        room_id INTEGER, room_count INTEGER, notes TEXT, deleted_at TEXT
      );
      CREATE TABLE "${TEST_SCHEMA}".conversations (
        id SERIAL PRIMARY KEY, guest_name TEXT NOT NULL, property_name TEXT NOT NULL,
        last_message TEXT, last_message_time TEXT, unread_count INTEGER NOT NULL DEFAULT 0,
        avatar_url TEXT
      );
      CREATE TABLE "${TEST_SCHEMA}".messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".conversations(id) ON DELETE CASCADE,
        sender_name TEXT NOT NULL, sender_type TEXT NOT NULL DEFAULT 'guest',
        content TEXT NOT NULL, sent_at TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".revenue_data (
        id SERIAL PRIMARY KEY, month TEXT NOT NULL, revenue INTEGER NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".gallery_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL, title TEXT, tags TEXT[], star_rating INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual', drive_file_id TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".expenses (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        category TEXT NOT NULL, amount INTEGER NOT NULL, description TEXT,
        date TEXT NOT NULL, receipt_url TEXT
      );
      CREATE TABLE "${TEST_SCHEMA}".enquiries (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        guest_name TEXT NOT NULL, guest_email TEXT, guest_phone TEXT,
        message TEXT, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".reviews (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        guest_name TEXT NOT NULL, platform TEXT NOT NULL DEFAULT 'direct',
        rating INTEGER NOT NULL, review_text TEXT, response_text TEXT,
        review_date TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".housekeeping_tasks (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES "${TEST_SCHEMA}".properties(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'cleaning', title TEXT NOT NULL, description TEXT,
        status TEXT NOT NULL DEFAULT 'pending', assignee TEXT, due_date TEXT,
        priority TEXT NOT NULL DEFAULT 'medium', booking_id INTEGER
      );
      CREATE TABLE "${TEST_SCHEMA}".notifications (
        id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
        message TEXT NOT NULL, link TEXT, is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE "${TEST_SCHEMA}".user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES "${TEST_SCHEMA}".users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        push_notifications BOOLEAN NOT NULL DEFAULT true,
        booking_alerts BOOLEAN NOT NULL DEFAULT true,
        message_alerts BOOLEAN NOT NULL DEFAULT true
      );
    `;
    await client.query(tablesDDL);
  } finally {
    client.release();
  }

  pool.on("connect", (client) => {
    client.query(`SET search_path TO "${TEST_SCHEMA}", public`);
  });

  await db.execute(sql.raw(`SET search_path TO "${TEST_SCHEMA}", public`));
});

afterEach(async () => {
  const tables = [
    "user_preferences", "notifications", "housekeeping_tasks", "reviews",
    "enquiries", "expenses", "gallery_images", "revenue_data", "messages",
    "conversations", "bookings", "rooms", "property_links", "properties", "users",
  ];
  for (const table of tables) {
    await db.execute(sql.raw(`DELETE FROM "${TEST_SCHEMA}"."${table}"`));
  }
});

afterAll(async () => {
  try {
    await db.execute(sql.raw(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`));
  } catch {
  }
  await pool.end();
});
