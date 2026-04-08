import { neon } from "@neondatabase/serverless";

// ✅ Create DB client (single instance)
export const sql = neon(process.env.DATABASE_URL);

// ✅ Initialize DB (create tables safely)
export const initDb = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in .env");
    }

    console.log("🔌 Connecting to database...");

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
    `;

    console.log("🐘 Database ready");
  } catch (err) {
    console.error("❌ DB Initialization Failed:", err.message);
    throw err; // important → stops server if DB fails
  }
};