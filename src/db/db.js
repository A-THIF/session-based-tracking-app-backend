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
      -- 1. Main Session Table
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        host_id VARCHAR(50), -- To identify who started it
        duration_minutes INTEGER NOT NULL,
        start_time TIMESTAMPTZ DEFAULT NOW(),
        end_time TIMESTAMPTZ, -- Calculated start_time + duration
        is_active BOOLEAN DEFAULT TRUE
      );

      -- 2. Participants Table (Who joined)
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code),
        user_id VARCHAR(50), -- Device ID or username
        joined_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 3. Breadcrumbs (The Path History)
      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code),
        user_id VARCHAR(50),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log("🐘 Database ready");
  } catch (err) {
    console.error("❌ DB Initialization Failed:", err.message);
    throw err; // important → stops server if DB fails
  }
};