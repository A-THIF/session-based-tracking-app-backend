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

export const handleAblyWebhook = async (req, res) => {
  // 1. Get the messages from the Ably Envelope
  const items = req.body.messages || req.body.items || []; 
  console.log(`Ably Webhook Triggered: Received ${items.length} items`);
  
  try {
    for (const item of items) {
      // 2. ENVELOPE PROTOCOL FIX
      // In "Enveloped" mode, Ably puts metadata in 'item' but the 
      // actual publish info is often inside 'item.message'
      const channelName = item.channelId || item.channel || (item.message ? item.message.channel : "");
      
      console.log(`Debug: Identified channel as: "${channelName}"`);

      if (!channelName || !channelName.includes('session_')) {
         console.log("⚠️ Skipping: Channel name missing from envelope structure");
         continue;
      }
      
      const sessionCode = channelName.replace('session_', '').toUpperCase();

      // 3. DATA EXTRACTION FIX
      // Depending on the version, data is either item.data or item.message.data
      let rawData = item.data || (item.message ? item.message.data : null);
      
      let messageData;
      try {
        messageData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      } catch (e) {
        console.log("⚠️ Skipping: Data is not valid JSON");
        continue; 
      }

      // 4. VALIDATION & INSERT
      if (messageData && messageData.deviceId && messageData.lat) {
        await sql`
          INSERT INTO location_history (session_code, device_id, latitude, longitude)
          VALUES (${sessionCode}, ${messageData.deviceId}, ${messageData.lat}, ${messageData.lng})
        `;
        console.log(`✅ DB Success: Session ${sessionCode} updated via Enveloped Webhook`);
      } else {
        console.log("⚠️ Payload structure mismatch:", JSON.stringify(messageData));
      }
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook Protocol Error:", err.message);
    res.status(200).json({ success: false, error: err.message });
  }
};
