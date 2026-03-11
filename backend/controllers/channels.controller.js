/**
 * channels.controller.js
 * ──────────────────────────────────────────────────────────────────────────
 * Handles channel CRUD + batch-polling endpoints for n8n integration.
 */
import * as channelService from '../services/channel.service.js';
import * as youtubeService from '../services/youtube.service.js';
import * as subscriptionService from '../services/subscription.service.js';
import { sendNewVideoNotification } from '../services/webhook.service.js';


// ─── GET /api/channels/all ──────────────────────────────────────────────────
export const getAllChannels = async (req, res) => {
    try {
        const ids = await channelService.getAllChannelIds();
        return res.status(200).json({ subscriptions: ids });
    } catch (error) {
        console.error('[getAllChannels] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── GET /api/channels/to-check ─────────────────────────────────────────────
/**
 * Returns a batch of channels that are due for an RSS check.
 * n8n calls this endpoint every ~30 min instead of /all.
 *
 * Query params:
 *   staleMinutes  – minutes before a channel is considered stale (default 10)
 *   limit         – max channels per batch (default 50)
 */
export const getChannelsToCheck = async (req, res) => {
    try {
        const staleMinutes = parseInt(req.query.staleMinutes) || 10;
        const limit = parseInt(req.query.limit) || 50;

        const channels = await channelService.getChannelsToCheck(staleMinutes, limit);
        return res.status(200).json({
            channels: channels.map((c) => c.channelId),
            count: channels.length,
        });
    } catch (error) {
        console.error('[getChannelsToCheck] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── POST /api/channels/check-result ────────────────────────────────────────
/**
 * n8n calls this after it checks a channel's RSS feed.
 * Body:
 *   { channel_id: "UC...", videos: ["videoId1", ...] }
 *
 * If videos array is non-empty → new videos found, updates last_video_at.
 * If videos array is empty     → no new videos, only bumps last_checked_at.
 *
 * When new videos are found, fires a webhook to N8N_NEW_VIDEO_WEBHOOK_URL
 * with the channel_id, new video IDs, and subscriber emails so n8n can
 * trigger notification emails.
 */
export const receiveCheckResult = async (req, res) => {
    try {
        const payload = req.body;

        // n8n might send an array or a single object. Normalize to an array.
        const items = Array.isArray(payload) ? payload : [payload];

        const results = [];
        let totalNewVideos = 0;
        const channelsWithNewVideos = [];
        console.log(channelsWithNewVideos);
        // Track channels that need notifications

        for (const item of items) {
            const { channel_id, videos } = item;

            if (!channel_id || typeof channel_id !== 'string') {
                console.warn('[receiveCheckResult] Skipped item due to missing or invalid channel_id:', item);
                continue;
            }

            // Extract the standard video ID from objects or strings, removing the 'yt:video:' prefix if present
            let videoIds = [];
            if (Array.isArray(videos)) {
                videoIds = videos.map(v => {
                    const rawId = typeof v === 'object' && v !== null ? v.id : v;
                    if (typeof rawId === 'string') {
                        return rawId.replace(/^yt:video:/, '');
                    }
                    return null;
                }).filter(Boolean);
            }

            // markChannelChecked already handles merging with existing videos and capping to 15
            const channel = await channelService.markChannelChecked(channel_id, videoIds);

            if (channel) {
                results.push(channel);
                totalNewVideos += videoIds.length;

                // If new videos were found, queue this channel for notification
                if (videoIds.length > 0) {
                    channelsWithNewVideos.push({ channelId: channel_id, newVideoIds: videoIds });
                }
            }
        }

        // ── Fire webhook notifications for channels with new videos ──────
        // Done after the DB updates so we don't block the response.
        // Errors are logged but don't fail the main request.
        if (channelsWithNewVideos.length > 0) {
            // Fire-and-forget: don't await so the response returns immediately
            (async () => {
                for (const { channelId, newVideoIds } of channelsWithNewVideos) {
                    try {
                        const subscribers = await subscriptionService.getChannelSubscribersWithEmail(channelId);
                        if (subscribers.length > 0) {
                            await sendNewVideoNotification({
                                channel_id: channelId,
                                new_videos: newVideoIds,
                                subscribers,
                            });
                            console.log(`[receiveCheckResult] ✓ Webhook sent for ${channelId} → ${subscribers.length} subscriber(s)`);
                        } else {
                            console.log(`[receiveCheckResult] No subscribers for ${channelId}, skipping webhook`);
                        }
                    } catch (webhookErr) {
                        console.error(`[receiveCheckResult] ✗ Webhook failed for ${channelId}:`, webhookErr.message);
                    }
                }
            })();
        }

        return res.status(200).json({
            success: true,
            processedCount: items.length,
            newVideosFound: totalNewVideos,
            updatedChannels: results.map(c => c.channelId),
            notificationsQueued: channelsWithNewVideos.length,
        });
    } catch (error) {
        console.error('[receiveCheckResult] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── PATCH /api/channels/:id/priority ───────────────────────────────────────
/**
 * Update the check_priority for a channel.
 * Body: { priority: <number> }
 */
export const setChannelPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (priority == null || typeof priority !== 'number') {
            return res.status(400).json({ error: 'priority (number) is required.' });
        }

        const channel = await channelService.updateCheckPriority(id, priority);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found.' });
        }

        return res.status(200).json({ success: true, channel });
    } catch (error) {
        console.error('[setChannelPriority] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── POST /api/channels/upsert ──────────────────────────────────────────────
export const upsertChannel = async (req, res) => {
    try {
        const { channelId, lastVideos } = req.body;

        if (!channelId || typeof channelId !== 'string') {
            return res.status(400).json({ error: 'channelId (string) is required.' });
        }
        if (!Array.isArray(lastVideos)) {
            return res.status(400).json({ error: 'lastVideos must be an array.' });
        }

        const channel = await channelService.upsertChannel(channelId, lastVideos);
        return res.status(200).json({ success: true, channel });
    } catch (error) {
        console.error('[upsertChannel] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── GET /api/channels/:id ──────────────────────────────────────────────────
export const getChannel = async (req, res) => {
    try {
        const { id } = req.params;

        const channel = await channelService.getChannel(id);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found.' });
        }

        // Optionally enrich with live YouTube details
        let ytDetails = null;
        try {
            const ytData = await youtubeService.getChannelsDetails([id]);
            ytDetails = ytData?.items?.[0] ?? null;
        } catch (ytErr) {
            console.warn('[getChannel] YouTube API enrichment failed (non-fatal):', ytErr.message);
        }

        return res.status(200).json({
            channel,
            ...(ytDetails && { ytDetails }),
        });
    } catch (error) {
        console.error('[getChannel] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// ─── POST /api/channels/subscribe ───────────────────────────────────────────
/**
 * Called when the user clicks the Subscribe button for a single channel
 * on the SetupPage search results. Fetches & caches the latest 15 videos.
 */
export const subscribeChannel = async (req, res) => {
    try {
        const { channelId } = req.body;

        if (!channelId || typeof channelId !== 'string') {
            return res.status(400).json({ error: 'channelId (string) is required.' });
        }

        const channel = await channelService.fetchAndCacheChannelVideos(channelId);
        return res.status(200).json({ success: true, channel });
    } catch (error) {
        console.error('[subscribeChannel] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

// ─── GET /api/channels/:channelId/subscribers ───────────────────────────────
/**
 * Returns all users subscribed to a channel, with their email addresses.
 * n8n calls this endpoint to know WHO to notify when a new video appears.
 */
export const getChannelSubscribers = async (req, res) => {
    try {
        const { channelId } = req.params;
        const subscribers = await subscriptionService.getChannelSubscribersWithEmail(channelId);

        return res.status(200).json({
            channelId,
            subscribers,
            count: subscribers.length,
        });
    } catch (error) {
        console.error('[getChannelSubscribers] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
