import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile
  // ❌ REMOVE: verifyEmail (It's not in userController)
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requestOTP, verifyOTP } from '../controllers/otpController.js'; 

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/otp/request', requestOTP); // 🟢 Added this for completeness
router.post('/verify-otp', verifyOTP);   // 🟢 Uses the import from otpController

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile/update', authenticateToken, updateProfile);

export default router; // 🟢 Ensure this line exists at the bottom!