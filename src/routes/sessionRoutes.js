import express from 'express';
import { createSession, joinSession } from '../controllers/sessionController.js';

const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);

export default router;