import { adjectives, nouns } from '../data/usernames.js';
import { sql } from '../db/db.js';

export const getUsernameSuggestions = async (req, res) => {
  const count = 5; 
  const suggestions = [];

  for (let i = 0; i < count; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const joiner = Math.random() > 0.5 ? '.' : '_';
    suggestions.push(`${adj}${joiner}${noun}`);
  }

  res.json({ suggestions });
};

export const claimIdentity = async (req, res) => {
  const { uuid, username } = req.body;

  // 1. Debug log to see what Flutter is actually sending
  console.log(`Attempting claim: UUID=[${uuid}], User=[${username}]`);

  if (!uuid || uuid === 'unknown' || !username) {
    return res.status(400).json({ error: 'Valid UUID and username required' });
  }

  try {
    const traceId = `TR-${Math.floor(Math.random() * 900 + 100)}-${
      Math.random().toString(36).substring(2, 5).toUpperCase()
    }`;

    // 2. Add "RETURNING *" to see the full result
    const result = await sql`
      INSERT INTO users (id, username, trace_id, last_seen)
      VALUES (${uuid}, ${username}, ${traceId}, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET username = ${username}, last_seen = NOW()
      RETURNING id, username, trace_id
    `;

    console.log("✅ Identity Claimed:", result[0]);
    res.json({ success: true, user: result[0] });
  } catch (err) {
    // 3. Log the ACTUAL error to Render console
    console.error("❌ SQL ERROR in claimIdentity:", err.message);

    if (err.message.includes('unique constraint')) {
      return res.status(409).json({ error: 'Username taken' });
    }
    
    // Send the actual error message back to Flutter temporarily to debug
    res.status(500).json({ error: err.message }); 
  }
};

export const getProfile = async (req, res) => {
  const { uuid } = req.query;
  try {
    const user = await sql`SELECT * FROM users WHERE id = ${uuid}`;
    if (user.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    res.json({ success: true, user: user[0] });
  } catch (err) {
    res.status(500).json({ error: "FETCH_FAILED" });
  }
};
