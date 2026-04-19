import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/session', sessionRoutes);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: "active", message: "Trace API is online 🚀" });
});

// ✅ Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// ✅ Global Error Standard (Internet Standard)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

export default app;