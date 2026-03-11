/**
 * user.controller.js
 * ──────────────────────────────────────────────────────────────────────────
 * All controllers are now async — user.service calls hit real Postgres.
 */
import * as userService from '../services/user.service.js';
import * as channelService from '../services/channel.service.js';
import { sendDataToN8n } from '../services/webhook.service.js';


// ─── POST /api/user/setup ──────────────────────────────────────────────────
export const setupUser = async (req, res) => {
    try {
        const { clerkId, subscriptions, email } = req.body;

        if (!clerkId || typeof clerkId !== 'string') {
            return res.status(400).json({ error: 'clerkId (string) is required.' });
        }
        if (!Array.isArray(subscriptions)) {
            return res.status(400).json({ error: 'subscriptions must be an array.' });
        }

        const user = await userService.saveSubscriptions(clerkId, subscriptions, email || null);

        // Fetch and cache the latest 15 videos for each channel.
        // Fire-and-forget — don't delay the response.
        if (subscriptions.length > 0) {
            Promise.all(
                subscriptions.map((channelId) =>
                    channelService.fetchAndCacheChannelVideos(channelId).catch((err) =>
                        console.warn(`[setupUser] Failed to cache videos for ${channelId}:`, err.message)
                    )
                )
            ).catch(() => { }); // suppress unhandled rejection at the outer level
        }

        // Fire-and-forget: send to n8n (don't block the response)
        sendDataToN8n({
            event: 'user_setup',
            clerkId,
            email: email || null,
            subscriptions,
            timestamp: new Date().toISOString(),
        }).catch((err) => console.error('[n8n] user_setup event failed:', err.message));

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('[setupUser] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── GET /api/user/verify ──────────────────────────────────────────────────
export const verifyUser = async (req, res) => {
    try {
        const clerkId = req.clerkId; // extracted by auth.middleware.js

        const user = await userService.verifyUser(clerkId);

        if (user) {
            return res.status(200).json({
                exists: true,
                user,
                // Flatten for backward compat with frontend hydration
                subscriptions: user.subscriptions,
                history: user.history,
                likedVideos: user.likedVideos,
                playlists: user.playlists,
            });
        }

        return res.status(200).json({ exists: false });
    } catch (error) {
        console.error('[verifyUser] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


// ─── POST /api/user/sync ───────────────────────────────────────────────────
export const syncUserData = async (req, res) => {
    try {
        const clerkId = req.clerkId;
        const { history, likedVideos, playlists, subscriptions } = req.body;

        const updatedUser = await userService.updateUserData(clerkId, {
            history,
            likedVideos,
            playlists,
            subscriptions,
        });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Fire-and-forget
        sendDataToN8n({
            event: 'user_sync',
            clerkId,
            history,
            likedVideos,
            playlists,
            subscriptions,
            timestamp: new Date().toISOString(),
        }).catch((err) => console.error('[n8n] user_sync event failed:', err.message));

        return res.status(200).json({ message: 'User data synced successfully', user: updatedUser });
    } catch (error) {
        console.error('[syncUserData] Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
