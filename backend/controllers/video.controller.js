/**
 * video.controller.js
 * ──────────────────────────────────────────────────────────────────────────
 * Handles the video ingestion endpoint (POST /api/videos/bulk) and
 * video query endpoints.
 *
 * This is the entry point n8n uses to push newly detected videos
 * into the database. When genuinely new videos are stored, the controller
 * automatically sends a webhook to n8n with channel_id + subscriber emails
 * so n8n can handle notification delivery.
 * ──────────────────────────────────────────────────────────────────────────
 */
import axios from 'axios';
import * as videoService from '../services/video.service.js';
import * as channelService from '../services/channel.service.js';
import * as subscriptionService from '../services/subscription.service.js';

// Webhook URL for new-video notifications (set in .env)
const NEW_VIDEO_WEBHOOK_URL = process.env.N8N_NEW_VIDEO_WEBHOOK_URL;

/**
 * Fire-and-forget: notify n8n about new videos for a channel.
 * Sends channel_id, the new videos, and all subscriber emails.
 */
async function notifyN8nNewVideos(channelId, newVideos) {
    try {
        if (!NEW_VIDEO_WEBHOOK_URL) {
            console.warn('[notifyN8n] N8N_NEW_VIDEO_WEBHOOK_URL not set – skipping notification');
            return;
        }

        // Look up every user subscribed to this channel (with their email)
        const subscribers = await subscriptionService.getChannelSubscribersWithEmail(channelId);

        if (subscribers.length === 0) {
            console.log(`[notifyN8n] No subscribers for ${channelId} – skipping`);
            return;
        }

        const payload = {
            event: 'new_videos',
            channel_id: channelId,
            new_videos: newVideos,
            subscribers,                 // [{ userId, email }, ...]
            subscriber_count: subscribers.length,
            sent_at: new Date().toISOString(),
            source: 'YouTube Backend',
        };

        const response = await axios.post(NEW_VIDEO_WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'YouTube-Backend/1.0',
            },
            timeout: 10000,
        });

        console.log(`✓ [notifyN8n] Sent ${newVideos.length} new video(s) + ${subscribers.length} subscriber(s) for ${channelId}`);
        return response.data;
    } catch (error) {
        // Don't throw — notification failure should never break video ingestion
        console.error(`✗ [notifyN8n] Failed for ${channelId}:`, error.message);
    }
}

// ─── POST /api/videos/bulk ─────────────────────────────────────────────────
/**
 * Receives one or more channel+videos payloads from n8n.
 * Payload can be a single object or an array of objects.
 *
 * Single object format:
 * {
 *   "channel_id": "UCxxx",
 *   "videos": [{ "id": "yt:video:abc", "title": "...", "link": "...", "pubDate": "..." }]
 * }
 *
 * Array format: [ { channel_id, videos }, ... ]
 */
export const bulkIngestVideos = async (req, res) => {
    try {
        const payload = req.body;
        const items = Array.isArray(payload) ? payload : [payload];

        const results = [];

        for (const item of items) {
            const { channel_id, videos } = item;

            if (!channel_id || typeof channel_id !== 'string') {
                console.warn('[bulkIngestVideos] Skipped item – missing channel_id:', item);
                continue;
            }

            const videoArr = Array.isArray(videos) ? videos : [];

            // 1. Insert videos into the videos table (duplicates silently skipped)
            const newVideos = await videoService.insertVideos(channel_id, videoArr);

            // 2. Extract just the video IDs for the channel's last_videos cache
            const newVideoIds = videoArr.map(v => {
                const rawId = typeof v === 'object' && v !== null ? v.id : v;
                return typeof rawId === 'string' ? rawId.replace(/^yt:video:/, '') : null;
            }).filter(Boolean);

            // 3. Mark channel as checked (updates last_videos, last_checked_at, etc.)
            const channel = await channelService.markChannelChecked(channel_id, newVideoIds);

            // 4. If genuinely new videos were inserted, notify n8n (fire-and-forget)
            if (newVideos.length > 0) {
                notifyN8nNewVideos(channel_id, newVideos).catch(() => { });
            }

            results.push({
                channelId: channel_id,
                newVideosInserted: newVideos.length,
                totalVideosReceived: videoArr.length,
                channel,
            });
        }

        return res.status(200).json({
            success: true,
            processedChannels: results.length,
            results,
        });
    } catch (error) {
        console.error('[bulkIngestVideos] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// ─── GET /api/videos/channel/:channelId ────────────────────────────────────
/**
 * Get the most recent videos for a channel from the videos table.
 * Query params: ?limit=15
 */
export const getVideosByChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const limit = parseInt(req.query.limit) || 15;

        const videos = await videoService.getVideosByChannel(channelId, limit);
        return res.status(200).json({ videos, count: videos.length });
    } catch (error) {
        console.error('[getVideosByChannel] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

