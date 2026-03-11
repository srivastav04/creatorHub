/**
 * video.service.js
 * ──────────────────────────────────────────────────────────────────────────
 * DB operations for the videos table.
 * Stores video metadata detected by the RSS feed worker / n8n.
 * ──────────────────────────────────────────────────────────────────────────
 */
import pool from '../db/db.js';

// ─── insertVideos ──────────────────────────────────────────────────────────
/**
 * Bulk-insert videos for a single channel. Skips duplicates via ON CONFLICT.
 * Returns the list of videos that were actually NEW (inserted, not skipped).
 *
 * @param {string} channelId
 * @param {Array<{ id: string, title?: string, link?: string, pubDate?: string }>} videos
 * @returns {Promise<Array<{ videoId: string, title: string, url: string, publishedAt: string }>>}
 */
export async function insertVideos(channelId, videos) {
    if (!videos.length) return [];

    const newVideos = [];

    for (const v of videos) {
        // Normalise the video ID (strip RSS yt:video: prefix if present)
        const videoId = (typeof v.id === 'string' ? v.id : '').replace(/^yt:video:/, '');
        if (!videoId) continue;

        const title = v.title ?? null;
        const url = v.link ?? `https://www.youtube.com/watch?v=${videoId}`;
        const publishedAt = v.pubDate ?? v.isoDate ?? null;

        const sql = `
            INSERT INTO videos (video_id, channel_id, title, url, published_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (video_id) DO NOTHING
            RETURNING *
        `;
        const { rows } = await pool.query(sql, [videoId, channelId, title, url, publishedAt]);

        // Only add to newVideos if it was actually inserted (not a duplicate)
        if (rows.length > 0) {
            newVideos.push({
                videoId: rows[0].video_id,
                channelId: rows[0].channel_id,
                title: rows[0].title,
                url: rows[0].url,
                publishedAt: rows[0].published_at,
            });
        }
    }

    return newVideos;
}

// ─── getVideosByChannel ────────────────────────────────────────────────────
/**
 * Get the most recent videos for a channel.
 *
 * @param {string} channelId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getVideosByChannel(channelId, limit = 15) {
    const sql = `
        SELECT * FROM videos
        WHERE channel_id = $1
        ORDER BY published_at DESC NULLS LAST
        LIMIT $2
    `;
    const { rows } = await pool.query(sql, [channelId, limit]);
    return rows.map((r) => ({
        videoId: r.video_id,
        channelId: r.channel_id,
        title: r.title,
        url: r.url,
        publishedAt: r.published_at,
        createdAt: r.created_at,
    }));
}

// ─── getVideo ──────────────────────────────────────────────────────────────
/**
 * Get a single video by ID.
 */
export async function getVideo(videoId) {
    const { rows } = await pool.query(
        'SELECT * FROM videos WHERE video_id = $1',
        [videoId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
        videoId: r.video_id,
        channelId: r.channel_id,
        title: r.title,
        url: r.url,
        publishedAt: r.published_at,
        createdAt: r.created_at,
    };
}
