import express from 'express';
import { bulkIngestVideos, getVideosByChannel } from '../controllers/video.controller.js';

const router = express.Router();

// POST /api/videos/bulk  — n8n pushes newly detected videos here
router.post('/bulk', bulkIngestVideos);

// GET  /api/videos/channel/:channelId  — fetch stored videos for a channel
router.get('/channel/:channelId', getVideosByChannel);

export default router;
