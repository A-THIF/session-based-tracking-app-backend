import { realtime } from "../config/ably.js";

export const generateToken = async (req, res) => {
  try {
    const { sessionCode } = req.query;

    if (!sessionCode) {
      return res.status(400).json({ error: "Session code required" });
    }

    const tokenRequest = await realtime.auth.createTokenRequest({
      clientId: `user-${Math.random().toString(36).substring(7)}`,
      capability: JSON.stringify({
        [`session_${sessionCode}`]: ["publish", "subscribe", "presence"],
      }),
    });

    res.json(tokenRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Auth failed" });
  }
};