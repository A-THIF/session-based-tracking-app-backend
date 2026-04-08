import 'dotenv/config';

import app from './src/app.js';
import { initDb } from './src/db/db.js';
// server.js

const PORT = process.env.PORT || 3000;

// Init DB then Start Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Trace Server running on port ${PORT}`);
  });
});