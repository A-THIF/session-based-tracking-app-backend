import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import app from './src/app.js';
import { initDb, sql } from './src/db/db.js';
import userRoutes from './src/routes/userRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import sessionRoutes from './src/routes/sessionRoutes.js';
import otpRoutes from './src/routes/otpRoutes.js';

const PORT = process.env.PORT || 3000;

// 🛡️ Identity & IP-based Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again after 15 minutes" }
});

app.set('trust proxy', 1);

// 🟢 Apply Limiter to sensitive routes
app.use('/session', limiter);
app.use('/auth', limiter);
app.use('/otp', limiter);

// 🛣️ Route Registration
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/session', sessionRoutes);
app.use('/otp', otpRoutes);

// 🧹 Optimized Batch Janitor (Matches your latest logs)
setInterval(async () => {
  console.log("🧹 Janitor scanning...");
  try {
    const expired = await sql`
      SELECT code FROM sessions
      WHERE expires_at < NOW() AND is_active = TRUE
    `;

    if (expired.length === 0) {
      console.log("✅ No expired sessions");
      return;
    }

    const codes = expired.map(s => s.code);
    await sql`DELETE FROM location_history WHERE session_code = ANY(${codes})`;
    await sql`DELETE FROM participants WHERE session_code = ANY(${codes})`;
    await sql`UPDATE sessions SET is_active = FALSE WHERE code = ANY(${codes})`;

    console.log(`🗑️ Purged ${codes.length} expired sessions`);
  } catch (err) {
    console.error("Janitor Error:", err.message);
  }
}, 60 * 60 * 1000);

initDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 Trace Server running on port ${PORT}`));
}).catch(err => {
  console.error("❌ Startup failed:", err);
  process.exit(1);
});