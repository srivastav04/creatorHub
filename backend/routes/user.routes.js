import express from 'express';
import { setupUser, verifyUser, syncUserData } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route: POST /api/user/setup
router.post('/setup', setupUser);

// Route: GET /api/user/verify
// Uses authMiddleware to extract clerkId before hit verifyUser controller
router.get('/verify', authMiddleware, verifyUser);

// Route: POST /api/user/sync
router.post('/sync', authMiddleware, syncUserData);

export default router;
