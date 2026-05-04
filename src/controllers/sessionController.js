import crypto from 'crypto';
import { sql } from '../db/db.js';

// ✅ Ensure "export" is present here
export const createSession = async (req, res) => {
  const duration = req.body?.duration || 60;
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();

  try {
    console.log(`🚀 Attempting to create session: ${code}`);
    const result = await sql`
      INSERT INTO sessions (code, duration_minutes, expires_at) 
      VALUES (${code}, ${duration}, NOW() + (${duration} * INTERVAL '1 minute')) 
      RETURNING code, expires_at
    `;

    console.log("✅ DB Success:", result[0]);

    res.status(201).json({ 
      sessionCode: result[0].code,
      expiresAt: result[0].expires_at 
    });

  } catch (err) {
    console.error("❌ DB FATAL ERROR:", err.message); // This will tell us if it's a login/password issue
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};
// ✅ Add this export too for the "Join" feature later
export const joinSession = async (req, res, next) => {
  const { code, deviceId } = req.body;
  try {
    // 1. Verify session exists
    const session = await sql`
      SELECT * FROM sessions 
      WHERE code = ${code.toUpperCase()} 
      AND is_active = TRUE 
      AND expires_at > NOW()
    `;

    if (session.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid session" });
    }

    // 2. Insert into participants so the session has membership data.
    await sql`
      INSERT INTO participants (session_code, device_id, joined_at)
      VALUES (${code.toUpperCase()}, ${deviceId}, NOW())
      ON CONFLICT (session_code, device_id) DO NOTHING
    `;

    res.status(200).json({
      success: true,
      session: { code: session[0].code, id: session[0].id }
    });
  } catch (err) {
    next(err);
  }
};

// Add this to your sessionController.js

export const endSession = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Session code required" });

  try {
    const sessionCode = code.toUpperCase();
    console.log(`🔒 Privacy Purge: Ending session ${sessionCode}`);

    // 1. Delete all location breadcrumbs
    await sql`DELETE FROM location_history WHERE session_code = ${sessionCode}`;
    
    // 2. Delete participant links
    await sql`DELETE FROM participants WHERE session_code = ${sessionCode}`;
    
    // 3. Mark session as inactive
    await sql`UPDATE sessions SET is_active = FALSE WHERE code = ${sessionCode}`;

    res.status(200).json({ success: true, message: "All session data purged." });
  } catch (err) {
    console.error("❌ Purge Error:", err.message);
    res.status(500).json({ error: "Internal Server Error during purge" });
  }
};


// src/controllers/sessionController.js

// Add this at the bottom of your file
export const logAuditError = async (req, res) => {
  const { event, session, message, device, timestamp } = req.body;

  // This log will appear in your Render "Logs" dashboard.
  // We use console.error or console.warn to make it stand out from regular logs.
  console.warn(`
    [REMOTE_AUDIT] ----------------------------
    EVENT:     ${event}
    SESSION:   ${session || 'N/A'}
    DEVICE:    ${device || 'Unknown'}
    TIME:      ${timestamp}
    MESSAGE:   ${message}
    -------------------------------------------
  `);

  // Optionally: You could also save these to a 'logs' table in Neon DB 
  // if you want to analyze them later. For now, console is enough.

  res.status(200).json({ success: true });
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

// src/controllers/sessionController.js

export const handleAblyWebhook = async (req, res) => {
  const items = req.body.messages || req.body.items || []; 
  // 🟢 FIX: Extract header safely
  const headerChannel = req.headers['x-ably-channel'] || "";
  
  try {
    for (const item of items) {
      // 🟢 FIX: Correctly check for channel name in all possible Ably spots
      const channelName = item.channel || item.channelId || req.body.channel || headerChannel || "";

      if (!channelName || !channelName.includes('session_')) {
         continue;
      }
      
      const sessionCode = channelName.replace('session_', '').toUpperCase();

      let messageData = item.data;
      if (typeof messageData === 'string') {
        try {
          messageData = JSON.parse(messageData);
        } catch (e) { continue; }
      }

      if (messageData && messageData.deviceId && (messageData.lat || messageData.latitude)) {
        const lat = messageData.lat || messageData.latitude;
        const lng = messageData.lng || messageData.longitude;

        await sql`
          INSERT INTO location_history (session_code, device_id, latitude, longitude)
          VALUES (${sessionCode}, ${messageData.deviceId}, ${lat}, ${lng})
        `;
        console.log(`✅ DB Success: Session ${sessionCode} updated`);
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook Protocol Error:", err.message);
    res.status(200).json({ success: false, error: err.message });
  }
};