import { realtime } from "../config/ably.js";

export const generateToken = async (req, res) => {
  try {
    const { sessionCode, clientId } = req.query;

    if (!sessionCode || !clientId) {
      return res.status(400).json({ success: false, message: "Missing params" });
    }

    const tokenDetails = await realtime.auth.requestToken({
      clientId,
      capability: {
        [`session_${sessionCode}`]: ["publish", "subscribe", "presence", "history"],
      },
    });

    res.status(200).json({
      success: true,
      token: tokenDetails.token,
    });
  } catch (err) {
    console.error("Ably Auth Error:", err);
    res.status(500).json({ success: false, error: "Auth failed" });
  }
};
