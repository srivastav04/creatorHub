/**
 * user.service.js
 * ──────────────────────────────────────────────────────────────────────────
 * All DB operations for the Users table.
 * Now uses the normalised subscriptions table instead of channel_ids[].
 * ──────────────────────────────────────────────────────────────────────────
 */
import pool from '../db/db.js';
import * as subscriptionService from './subscription.service.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map a raw DB row → the shape controllers/frontend expect. */
function rowToUser(row, subscriptions = []) {
    return {
        clerkId: row.clerk_id,
        email: row.email ?? null,
        subscriptions,                       // populated separately from subscriptions table
        likedVideos: row.liked_videos ?? [],
        playlists: row.playlists ?? [],
        history: row.history ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ─── saveSubscriptions ─────────────────────────────────────────────────────

/**
 * Upsert a user row (with optional email), then replace their subscriptions
 * in the normalised subscriptions table.
 *
 * @param {string}   clerkId
 * @param {string[]} subscriptions  – channel IDs
 * @param {string}   [email]        – user email (collected during onboarding)
 * @returns {Promise<object>}  normalised user object
 */
export async function saveSubscriptions(clerkId, subscriptions, email = null) {
    // Upsert the user row
    const sql = `
        INSERT INTO users (clerk_id, channel_ids, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (clerk_id)
        DO UPDATE SET
          channel_ids = EXCLUDED.channel_ids,
          email       = COALESCE(EXCLUDED.email, users.email),
          updated_at  = NOW()
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [clerkId, subscriptions, email]);

    // Replace subscriptions in the normalised table
    await subscriptionService.replaceUserSubscriptions(clerkId, subscriptions);

    return rowToUser(rows[0], subscriptions);
}

// ─── verifyUser ────────────────────────────────────────────────────────────

/**
 * Check if a user exists. Loads subscriptions from the normalised table.
 * @param {string} clerkId
 * @returns {Promise<object|null>}
 */
export async function verifyUser(clerkId) {
    const { rows } = await pool.query(
        'SELECT * FROM users WHERE clerk_id = $1',
        [clerkId],
    );
    if (!rows.length) return null;

    const subs = await subscriptionService.getUserSubscriptions(clerkId);
    return rowToUser(rows[0], subs);
}

// ─── updateUserData ────────────────────────────────────────────────────────

/**
 * Patch user fields (history, likedVideos, playlists, subscriptions).
 * Only updates fields that are explicitly provided (not null/undefined).
 * If subscriptions are provided, also updates the normalised table.
 *
 * @param {string} clerkId
 * @param {{ history?, likedVideos?, playlists?, subscriptions? }} data
 * @returns {Promise<object|null>}
 */
export async function updateUserData(clerkId, data) {
    // Build SET clause dynamically for only provided fields
    const setClauses = [];
    const values = [];
    let idx = 1;

    if (data.history !== undefined) {
        // Cap history at 10 most-recent entries
        setClauses.push(`history = $${idx++}`);
        values.push(data.history.slice(0, 10));
    }
    if (data.likedVideos !== undefined) {
        setClauses.push(`liked_videos = $${idx++}`);
        values.push(data.likedVideos);
    }
    if (data.playlists !== undefined) {
        setClauses.push(`playlists = $${idx++}`);
        values.push(JSON.stringify(data.playlists));
    }
    if (data.subscriptions !== undefined) {
        setClauses.push(`channel_ids = $${idx++}`);
        values.push(data.subscriptions);
        // Also update the normalised subscriptions table
        await subscriptionService.replaceUserSubscriptions(clerkId, data.subscriptions);
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`updated_at = NOW()`);
    values.push(clerkId); // last param for WHERE

    const sql = `
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE clerk_id = $${idx}
        RETURNING *
    `;

    const { rows } = await pool.query(sql, values);
    if (!rows.length) return null;

    const subs = await subscriptionService.getUserSubscriptions(clerkId);
    return rowToUser(rows[0], subs);
}
