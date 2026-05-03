import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import app from './src/app.js';
import { initDb } from './src/db/db.js';
// server.js


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes"
  }
});

// Apply the rate limiter to all session and auth routes
app.use('/session', limiter);
app.use('/auth', limiter);

const PORT = process.env.PORT || 3000;

// Init DB then Start Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Trace Server running on port ${PORT}`);
  });
});