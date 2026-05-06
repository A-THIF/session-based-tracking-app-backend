import { neon } from "@neondatabase/serverless";

// DB connection
export const sql = neon(process.env.DATABASE_URL);

export const initDb = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in .env");
    }

    console.log("🔌 Connecting to database...");

    // Enable UUID generation
    await sql`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `;

    // =========================
    // 1. Sessions Table
    // =========================
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

    // =========================
    // 2. Participants Table
    // =========================
    await sql`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code) ON DELETE CASCADE,
        device_id VARCHAR(100),
        joined_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS participants_session_device_key
      ON participants (session_code, device_id);
    `;

    // =========================
    // 3. Location History Table
    // =========================
    await sql`
      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        session_code VARCHAR(6) REFERENCES sessions(code) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // =========================
    // 4. Users Table
    // =========================
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(100),
        profile_type VARCHAR(50) DEFAULT 'genz_1',
        is_dark_theme BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // =========================
    // 5. OTP Verification Table
    // =========================
    await sql`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `;

    console.log("🐘 Database ready");
  } catch (err) {
    console.error("❌ DB Initialization Failed:", err.message);
    throw err;
  }
};