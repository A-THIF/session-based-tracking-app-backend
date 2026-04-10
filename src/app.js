import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js'; // You'll create this for /auth

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/session', sessionRoutes);
app.use('/auth', authRoutes); // Link your auth routes here
app.get('/', (req, res) => {
  res.send('Server is up and running! 🚀');
});

export default app;
