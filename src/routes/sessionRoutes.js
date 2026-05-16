import express from 'express';
import { 
  createSession, 
  joinSession, 
  getSessionDetails, 
  handleAblyWebhook, 
  logAuditError, // New
  endSession
} from '../controllers/sessionController.js';
import { getRoutePath } from '../controllers/routingController.js';
import { handleAblyPresenceWebhook } from '../controllers/sessionController.js';

const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:code', getSessionDetails);
router.post('/webhook', handleAblyWebhook);
router.get('/route/path', getRoutePath);

// 🔴 New Route for Remote Logging
router.post('/audit/log', logAuditError);
router.post('/end', endSession);
router.post('/presence-webhook', handleAblyPresenceWebhook); // 🟢 ADD THIS LINE FOR HEARBEATS


export default router;