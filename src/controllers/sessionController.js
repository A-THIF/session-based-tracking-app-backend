import crypto from 'crypto';
import { sql } from '../db/db.js';

// ✅ Ensure "export" is present here
export const createSession = async (req, res) => {
  const duration = req.body?.duration || 60;
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();

  try {
    const result = await sql`
      INSERT INTO sessions (code, duration_minutes, expires_at) 
      VALUES (
        ${code}, 
        ${duration}, 
        NOW() + (${duration} * INTERVAL '1 minute')
      ) 
      RETURNING code, expires_at
    `;

    res.status(201).json({ 
      sessionCode: result[0].code,
      expiresAt: result[0].expires_at 
    });

  } catch (err) {
    console.error("DB ERROR:", err);  // 🔥 ADD THIS
    res.status(500).json({ error: "Creation failed" });
  }
};
// ✅ Add this export too for the "Join" feature later
export const joinSession = async (req, res) => {
  const { code } = req.body;
  try {
    const session = await sql`
      SELECT * FROM sessions 
      WHERE code = ${code.toUpperCase()} 
      AND is_active = TRUE 
      AND expires_at > NOW()
    `;

    if (session.length === 0) {
      return res.status(404).json({ error: "Invalid or expired session code" });
    }
    res.json({ message: "Session joined successfully", session: session[0] });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

export const getSessionDetails = async (req, res) => {
  const { code } = req.params;

  try {
    // 1. Get Session Info
    const session = await sql`
      SELECT * FROM sessions WHERE code = ${code.toUpperCase()}
    `;

    if (session.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // 2. Get the Path History (The breadcrumbs)
    const path = await sql`
      SELECT latitude, longitude, recorded_at 
      FROM location_history 
      WHERE session_code = ${code.toUpperCase()} 
      ORDER BY recorded_at ASC
    `;

    res.json({
      session: session[0],
      path: path // This returns an array of coordinates to draw the line
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
