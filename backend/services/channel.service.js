/**
 * channel.service.js
 * ──────────────────────────────────────────────────────────────────────────
 * DB operations for the Channels table.
 * Supports batch-based polling with priority tracking for n8n.
 * Max 15 lastVideos enforced on every upsert.
 */
import pool from '../db/db.js';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { google } from 'googleapis';

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

const xmlParser = new XMLParser({ ignoreAttributes: false });

const MAX_VIDEOS = 15;

function rowToChannel(row) {
    return {
        channelId: row.channel_id,
        lastVideos: row.last_videos ?? [],
        lastVideoAt: row.last_video_at,
        lastCheckedAt: row.last_checked_at,
        checkPriority: row.check_priority,
        updatedAt: row.updated_at,
    };
}

// ─── upsertChannel ─────────────────────────────────────────────────────────

/**
 * Insert or update a channel's lastVideos list.
 * Merges with existing entries (newest-first) and caps at MAX_VIDEOS.
 *
 * @param {string}   channelId
 * @param {string[]} lastVideos  – video IDs (newest first)
 * @returns {Promise<object>}
 */
export async function upsertChannel(channelId, lastVideos) {
    // Fetch existing to merge & deduplicate
    const existing = await getChannel(channelId);
    const existingVideos = existing?.lastVideos ?? [];

    // Merge: new entries first, then existing, deduplicate, cap at MAX
    const merged = [...new Set([...lastVideos, ...existingVideos])].slice(0, MAX_VIDEOS);

    const sql = `
    INSERT INTO channels (channel_id, last_videos)
    VALUES ($1, $2)
    ON CONFLICT (channel_id)
    DO UPDATE SET
      last_videos = EXCLUDED.last_videos,
      updated_at  = NOW()
    RETURNING *
  `;
    const { rows } = await pool.query(sql, [channelId, merged]);
    return rowToChannel(rows[0]);
}

// ─── getChannel ────────────────────────────────────────────────────────────

/**
 * Fetch a single channel row by ID.
 * @param {string} channelId
 * @returns {Promise<object|null>}
 */
export async function getChannel(channelId) {
    const { rows } = await pool.query(
        'SELECT * FROM channels WHERE channel_id = $1',
        [channelId],
    );
    return rows.length ? rowToChannel(rows[0]) : null;
}

// ─── fetchAndCacheChannelVideos ────────────────────────────────────────────

/**
 * Fetches the latest up-to-15 video IDs for a channel via RSS feed
 * (falls back to YouTube Data API search on failure), then persists
 * them with upsertChannel so they're available for the feed immediately.
 *
 * @param {string} channelId
 * @returns {Promise<object>}  the updated channel row
 */
export async function fetchAndCacheChannelVideos(channelId) {
    let videoIds = [];

    try {
        // ── Primary: RSS feed (free, no quota) ────────────────────────────
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const { data: xml } = await axios.get(rssUrl, { timeout: 8000 });
        const parsed = xmlParser.parse(xml);
        const entries = parsed?.feed?.entry ?? [];

        videoIds = entries
            .slice(0, MAX_VIDEOS)
            .map((e) => e['yt:videoId'])
            .filter(Boolean);

        console.log(`[channel] RSS fetched ${videoIds.length} videos for ${channelId}`);
    } catch (rssErr) {
        console.warn(`[channel] RSS failed for ${channelId}, trying YT API fallback:`, rssErr.message);

        try {
            // ── Fallback: YouTube Data API search ─────────────────────────
            const res = await youtube.search.list({
                part: ['id'],
                channelId,
                maxResults: MAX_VIDEOS,
                order: 'date',
                type: 'video',
            });
            videoIds = (res.data.items ?? []).map((i) => i.id.videoId).filter(Boolean);
            console.log(`[channel] YT API fetched ${videoIds.length} videos for ${channelId}`);
        } catch (apiErr) {
            console.error(`[channel] Both RSS and YT API failed for ${channelId}:`, apiErr.message);
            // Still upsert with empty array so the channel row exists
        }
    }

    return upsertChannel(channelId, videoIds);
}

// ─── getAllChannelIds ──────────────────────────────────────────────────────

/**
 * Fetch all channel IDs from the database.
 * @returns {Promise<string[]>}
 */
export async function getAllChannelIds() {
    const { rows } = await pool.query('SELECT channel_id FROM channels');
    return rows.map((r) => r.channel_id);
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH POLLING FUNCTIONS (for n8n integration)
// ═══════════════════════════════════════════════════════════════════════════

// ─── getChannelsToCheck ───────────────────────────────────────────────────

/**
 * Returns a batch of channels that are "due" for an RSS check.
 * Channels whose last_checked_at is older than `staleMinutes` (default 10)
 * are returned, ordered by check_priority DESC, capped at `limit`.
 *
 * @param {number} staleMinutes  – how many minutes before a channel is stale
 * @param {number} limit         – max channels to return per batch
 * @returns {Promise<object[]>}
 */
export async function getChannelsToCheck(staleMinutes = 10, limit = 50) {
    const sql = `
        SELECT *
        FROM channels
        WHERE last_checked_at IS NULL
           OR last_checked_at < NOW() - INTERVAL '1 minute' * $1
        ORDER BY check_priority DESC, last_checked_at ASC NULLS FIRST
        LIMIT $2
    `;
    const { rows } = await pool.query(sql, [staleMinutes, limit]);
    return rows.map(rowToChannel);
}

// ─── markChannelChecked ───────────────────────────────────────────────────

/**
 * Called by n8n after it has checked a channel's RSS feed.
 * - If new videos were found → updates last_videos, last_video_at, last_checked_at
 * - If no new videos        → only bumps last_checked_at
 *
 * @param {string}   channelId
 * @param {string[]} newVideoIds   – new video IDs (empty array if none found)
 * @returns {Promise<object>}
 */
export async function markChannelChecked(channelId, newVideoIds = []) {
    if (newVideoIds.length > 0) {
        // Merge new videos into existing list
        const existing = await getChannel(channelId);
        const existingVideos = existing?.lastVideos ?? [];
        const merged = [...new Set([...newVideoIds, ...existingVideos])].slice(0, MAX_VIDEOS);

        const sql = `
            UPDATE channels
            SET last_videos     = $2,
                last_video_at   = NOW(),
                last_checked_at = NOW(),
                updated_at      = NOW()
            WHERE channel_id = $1
            RETURNING *
        `;
        const { rows } = await pool.query(sql, [channelId, merged]);
        if (!rows.length) return null;
        return rowToChannel(rows[0]);
    } else {
        // No new videos – just bump last_checked_at
        const sql = `
            UPDATE channels
            SET last_checked_at = NOW(),
                updated_at      = NOW()
            WHERE channel_id = $1
            RETURNING *
        `;
        const { rows } = await pool.query(sql, [channelId]);
        if (!rows.length) return null;
        return rowToChannel(rows[0]);
    }
}

// ─── updateCheckPriority ──────────────────────────────────────────────────

/**
 * Set the check_priority for a channel.
 * Higher value = checked more frequently.
 * Recommended: set to number of uploads in last 30 days.
 *
 * @param {string} channelId
 * @param {number} priority
 * @returns {Promise<object|null>}
 */
export async function updateCheckPriority(channelId, priority) {
    const sql = `
        UPDATE channels
        SET check_priority = $2,
            updated_at     = NOW()
        WHERE channel_id = $1
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [channelId, priority]);
    if (!rows.length) return null;
    return rowToChannel(rows[0]);
}
