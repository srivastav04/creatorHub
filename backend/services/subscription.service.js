/**
 * subscription.service.js
 * ──────────────────────────────────────────────────────────────────────────
 * DB operations for the normalised subscriptions table.
 * Replaces the old channel_ids TEXT[] approach in the users table.
 * ──────────────────────────────────────────────────────────────────────────
 */
import pool from '../db/db.js';

// ─── subscribe ─────────────────────────────────────────────────────────────
/**
 * Create a subscription row for (userId, channelId).
 * Silently ignores duplicates via ON CONFLICT.
 */
export async function subscribe(userId, channelId) {
    const sql = `
        INSERT INTO subscriptions (user_id, channel_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, channel_id) DO NOTHING
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [userId, channelId]);
    return rows[0] ?? null;
}

// ─── subscribeBulk ─────────────────────────────────────────────────────────
/**
 * Subscribe a user to many channels at once.
 * Uses UNNEST to insert in a single query.
 *
 * @param {string}   userId
 * @param {string[]} channelIds
 */
export async function subscribeBulk(userId, channelIds) {
    if (!channelIds.length) return;
    const sql = `
        INSERT INTO subscriptions (user_id, channel_id)
        SELECT $1, UNNEST($2::text[])
        ON CONFLICT (user_id, channel_id) DO NOTHING
    `;
    await pool.query(sql, [userId, channelIds]);
}

// ─── unsubscribe ───────────────────────────────────────────────────────────
/**
 * Remove a subscription row.
 * @returns {boolean} true if a row was deleted
 */
export async function unsubscribe(userId, channelId) {
    const { rowCount } = await pool.query(
        'DELETE FROM subscriptions WHERE user_id = $1 AND channel_id = $2',
        [userId, channelId],
    );
    return rowCount > 0;
}

// ─── getUserSubscriptions ──────────────────────────────────────────────────
/**
 * Get all channel IDs a user is subscribed to.
 * @returns {Promise<string[]>}
 */
export async function getUserSubscriptions(userId) {
    const { rows } = await pool.query(
        'SELECT channel_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
    );
    return rows.map((r) => r.channel_id);
}

// ─── getChannelSubscribers ─────────────────────────────────────────────────
/**
 * Get all user IDs subscribed to a channel.
 * Core function for the notification system — n8n calls this.
 * @returns {Promise<string[]>}
 */
export async function getChannelSubscribers(channelId) {
    const { rows } = await pool.query(
        'SELECT user_id FROM subscriptions WHERE channel_id = $1',
        [channelId],
    );
    return rows.map((r) => r.user_id);
}

// ─── getChannelSubscribersWithEmail ────────────────────────────────────────
/**
 * Get all subscribers of a channel WITH their email addresses.
 * Joins subscriptions → users to get the email in one query.
 * This is what n8n uses to send notification emails.
 *
 * @param {string} channelId
 * @returns {Promise<Array<{ userId: string, email: string | null }>>}
 */
export async function getChannelSubscribersWithEmail(channelId) {
    const sql = `
        SELECT s.user_id, u.email
        FROM subscriptions s
        JOIN users u ON u.clerk_id = s.user_id
        WHERE s.channel_id = $1
    `;
    const { rows } = await pool.query(sql, [channelId]);
    return rows.map((r) => ({ userId: r.user_id, email: r.email }));
}

// ─── replaceUserSubscriptions ──────────────────────────────────────────────
/**
 * Full-replace: delete existing subscriptions for a user and insert new ones.
 * Used during setup when the user picks channels from scratch.
 *
 * @param {string}   userId
 * @param {string[]} channelIds
 */
export async function replaceUserSubscriptions(userId, channelIds) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
        if (channelIds.length > 0) {
            const sql = `
                INSERT INTO subscriptions (user_id, channel_id)
                SELECT $1, UNNEST($2::text[])
                ON CONFLICT (user_id, channel_id) DO NOTHING
            `;
            await client.query(sql, [userId, channelIds]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
