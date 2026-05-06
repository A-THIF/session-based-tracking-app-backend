import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  verifyEmail // New: For OTP logic
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requestOTP, verifyOTP } from '../controllers/otpController.js'; // 🟢 Import from otpController

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);


// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile/update', authenticateToken, updateProfile);

export default router;