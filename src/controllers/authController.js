import { realtime } from "../config/ably.js";

export const generateToken = async (req, res) => {
  try {
    const { sessionCode } = req.query;

    if (!sessionCode) {
      return res.status(400).json({ success: false, message: "Session code required" });
    }

    // 🔥 FIX: We use requestToken to get the actual token string
    const tokenDetails = await realtime.auth.requestToken({
      clientId: `device-${Math.random().toString(36).substring(7)}`,
      capability: {
        [`session_${sessionCode}`]: ["publish", "subscribe", "presence"],
      },
    });

    // 🔥 CRITICAL: Send it back as { "success": true, "token": "..." }
    res.status(200).json({
      success: true,
      token: tokenDetails.token // This is the string Flutter needs
    });
    
  } catch (err) {
    console.error("Ably Auth Error:", err);
    res.status(500).json({ success: false, error: "Auth failed" });
  }
};