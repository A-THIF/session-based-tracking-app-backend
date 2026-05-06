import express from 'express';
import { requestOTP, verifyOTP } from '../controllers/otpController.js';

const router = express.Router();

router.post('/request', requestOTP);
router.post('/verify', verifyOTP);

export default router; // 🟢 This 'default' export is what server.js is looking for