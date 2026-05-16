import express from 'express';
import { 
  createSession, 
  joinSession, 
  getSessionDetails, 
  logAuditError,
  endSession,
  handleAblyPresenceWebhook
} from '../controllers/sessionController.js';
import { getRoutePath } from '../controllers/routingController.js';

const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/route/path', getRoutePath);
router.post('/audit/log', logAuditError);
router.post('/end', endSession);
router.post('/presence-webhook', handleAblyPresenceWebhook);
router.get('/:code', getSessionDetails);  // keep /:code last — it's a wildcard

export default router;