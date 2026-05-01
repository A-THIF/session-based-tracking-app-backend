import express from 'express';
import { 
  createSession, 
  joinSession, 
  getSessionDetails, 
  handleAblyWebhook, 
  logAuditError // New
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:code', getSessionDetails);
router.post('/webhook', handleAblyWebhook);

// 🔴 New Route for Remote Logging
router.post('/audit/log', logAuditError);

export default router;