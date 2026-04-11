import express from 'express';
import { createSession, joinSession, getSessionDetails, handleAblyWebhook } from '../controllers/sessionController.js';
const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:code', getSessionDetails);
router.post('/webhook', handleAblyWebhook);

export default router;
