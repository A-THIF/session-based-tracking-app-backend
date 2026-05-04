import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import app from './src/app.js';
import { initDb, sql } from './src/db/db.js';
import userRoutes from './src/routes/userRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import sessionRoutes from './src/routes/sessionRoutes.js';

app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/session', sessionRoutes);

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes"
  }
});

app.use('/session', limiter);
app.use('/auth', limiter);

// Auto-purge expired sessions
setInterval(async () => {
  console.log("🧹 Janitor scanning...");

  try {
    const expired = await sql`
      SELECT code FROM sessions
      WHERE expires_at < NOW()
      AND is_active = TRUE
    `;

    for (const session of expired) {
      await sql`
        DELETE FROM location_history
        WHERE session_code = ${session.code}
      `;

      await sql`
        DELETE FROM participants
        WHERE session_code = ${session.code}
      `;

      await sql`
        UPDATE sessions
        SET is_active = FALSE
        WHERE code = ${session.code}
      `;

      console.log(`🗑️ Purged ${session.code}`);
    }
  } catch (err) {
    console.error("Janitor Error:", err.message);
  }
}, 60 * 60 * 1000);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Trace Server running on port ${PORT}`);
  });
});