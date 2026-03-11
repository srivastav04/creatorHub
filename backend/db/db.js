import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ─── Connection pool ────────────────────────────────────────────────────────
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'youtube_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    // Retry logic handled at startup (see waitForDB below)
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Waits until the database is accepting connections.
 * Called once at server startup BEFORE any routes are served.
 * @param {number} retries  Number of remaining attempts
 * @param {number} delay    Milliseconds between retries
 */
export async function waitForDB(retries = 10, delay = 2000) {
    for (let i = 1; i <= retries; i++) {
        try {
            const client = await pool.connect();
            client.release();
            console.log('[DB] Connected to PostgreSQL ✓');
            return;
        } catch (err) {
            console.warn(`[DB] Not ready yet (attempt ${i}/${retries}): ${err.message}`);
            if (i === retries) {
                console.error('[DB] Could not connect to PostgreSQL – shutting down.');
                process.exit(1);
            }
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

export default pool;
