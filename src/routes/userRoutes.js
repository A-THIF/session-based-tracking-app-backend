import express from 'express';
import { getUsernameSuggestions, claimIdentity } from '../controllers/userController.js';

const router = express.Router();

router.get('/suggestions', getUsernameSuggestions);
router.post('/identity', claimIdentity);

export default router;