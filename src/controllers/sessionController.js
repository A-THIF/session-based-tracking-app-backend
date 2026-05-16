import crypto from 'crypto';
import { sql } from '../db/db.js';
import { realtime } from '../config/ably.js'; // Ensure your Ably REST client is imported

// ✅ Ensure "export" is present here
export const createSession = async (req, res) => {
  const duration = req.body?.duration || 60;
  const { deviceId } = req.body;  // add this
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();

  try {
     const result = await sql`
    INSERT INTO sessions (code, duration_minutes, expires_at, host_id)
    VALUES (${code}, ${duration}, NOW() + (${duration} * INTERVAL '1 minute'), ${deviceId ?? null})
    RETURNING code, expires_at
  `;
    res.status(201).json({ sessionCode: result[0].code, expiresAt: result[0].expires_at });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
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

    // 🟢 NEW: Broadcast termination to Ably channel so the Guest app closes instantly
    const channel = realtime.channels.get(`session_${sessionCode}`);
    await channel.publish('session_state', { state: 'ended', reason: 'manual_termination' });

    res.status(200).json({ success: true, message: "All session data purged and clients notified." });
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

export const handleAblyPresenceWebhook = async (req, res) => {
  // Ably presence webhook payloads typically group events in an 'items' array
  const items = req.body.items || [];

  try {
    for (const item of items) {
      const channelName = item.channel; // e.g., "session_A7B3C2"
      const action = item.action;       // 'leave', 'absent', or 'present'
      const clientId = item.clientId;   // The user's device UUID

      if (!channelName || !channelName.includes('session_')) continue;
      
      const sessionCode = channelName.replace('session_', '').toUpperCase();

      // We are looking for unexpected disconnects ('absent') or deliberate clean closes ('leave')
      if (action === 'absent' || action === 'leave') {
        console.log(`📡 Presence alert: Client ${clientId} left ${channelName} via ${action}`);

        // 1. Query the database to see if this disconnecting device is the Host of this session
        const sessionCheck = await sql`
          SELECT * FROM sessions 
          WHERE code = ${sessionCode} AND is_active = TRUE
        `;

        if (sessionCheck.length === 0) continue;

        // Assuming your sessions table tracks the host's device ID or you determine hosting status dynamically.
        // If your schema tracks who created the session, match it against clientId:
        const isHost = sessionCheck[0].host_id === clientId;

        if (isHost) {
          console.log(`🚨 Host Crash Detected for session ${sessionCode}! Initiating automated teardown.`);

          // 2. Perform the exact cleanup we designed in endSession
          await sql`DELETE FROM location_history WHERE session_code = ${sessionCode}`;
          await sql`DELETE FROM participants WHERE session_code = ${sessionCode}`;
          await sql`UPDATE sessions SET is_active = FALSE WHERE code = ${sessionCode}`;

          // 3. Broadcast to the Ably Channel that the session state has changed to 'ended'
          // This triggers the guest's mobile listener to pop them back home with "Host disconnected"
          const channel = realtime.channels.get(channelName);
          await channel.publish('session_state', { state: 'ended', reason: 'host_disconnected' });
        } else {
          // If a guest leaves, we do NOT destroy the session. We just log it.
          console.log(`ℹ️ Guest ${clientId} disconnected. Keeping session alive for host.`);

          await sql`
            UPDATE participants 
            SET status = 'offline', last_seen_at = NOW() 
            WHERE session_code = ${sessionCode} AND device_id = ${clientId}
          `;
        
        }
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Presence Webhook Failure:", err.message);
    res.status(200).json({ success: false, error: err.message }); 
  }
};