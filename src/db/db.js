import { neon } from "@neondatabase/serverless";

// ✅ This line is likely missing or named differently!
export const sql = neon(process.env.DATABASE_URL);

export const initDb = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in .env");
    }

    console.log("🔌 Connecting to database...");

    // 1. Create Sessions Table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        host_id VARCHAR(50),
        duration_minutes INTEGER DEFAULT 60,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
    `;

    // 2. Create Participants Table
    await sql`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code),
        device_id VARCHAR(100),
        joined_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Create Location History Table
    await sql`
      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code),
        device_id VARCHAR(100),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log("🐘 Database ready");
  } catch (err) {
    console.error("❌ DB Initialization Failed:", err.message);
    throw err; 
  }
};
