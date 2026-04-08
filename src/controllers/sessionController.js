import crypto from 'crypto';
import { sql } from '../db/db.js';

// ✅ Ensure "export" is present here
export const createSession = async (req, res) => {
  try {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const result = await sql`
      INSERT INTO sessions (code, created_at) 
      VALUES (${code}, NOW()) 
      RETURNING code
    `;

    res.status(201).json({ 
      sessionCode: result[0].code,
      expiresIn: "60 minutes" 
    });
  } catch (err) {
    console.error("❌ Session Creation Error:", err);
    res.status(500).json({ error: "Secure generation failed" });
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
      AND created_at > NOW() - INTERVAL '1 hour'
    `;

    if (session.length === 0) {
      return res.status(404).json({ error: "Invalid or expired session code" });
    }
    res.json({ message: "Session joined successfully", session: session[0] });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};