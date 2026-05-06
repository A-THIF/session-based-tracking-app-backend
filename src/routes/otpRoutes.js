import { requestOTP, verifyOTP } from '../controllers/otpController.js';

router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);