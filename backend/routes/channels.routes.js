import express from 'express';
import {
    upsertChannel,
    getChannel,
    subscribeChannel,
    getAllChannels,
    getChannelsToCheck,
    receiveCheckResult,
    setChannelPriority,
    getChannelSubscribers,
} from '../controllers/channels.controller.js';

const router = express.Router();

// ── Batch-polling endpoints (n8n integration) ───────────────────────────────

// GET  /api/channels/to-check       — n8n calls this to get stale channels
router.get('/to-check', getChannelsToCheck);

// POST /api/channels/check-result   — n8n posts back RSS results per channel
router.post('/check-result', receiveCheckResult);

// ── Existing endpoints ──────────────────────────────────────────────────────

// GET  /api/channels/all
router.get('/all', getAllChannels);

// POST /api/channels/upsert
router.post('/upsert', upsertChannel);

// POST /api/channels/subscribe  — fetch & cache latest 15 videos for one channel
router.post('/subscribe', subscribeChannel);

// PATCH /api/channels/:id/priority  — update check_priority for a channel
router.patch('/:id/priority', setChannelPriority);

// GET  /api/channels/:channelId/subscribers — n8n fetches subscribers to notify
router.get('/:channelId/subscribers', getChannelSubscribers);

// GET  /api/channels/:id
router.get('/:id', getChannel);

export default router;
