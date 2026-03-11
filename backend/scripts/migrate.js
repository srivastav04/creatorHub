import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import pool, { waitForDB } from '../db/db.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
    console.log('[migrate] Waiting for database…');
    await waitForDB(15, 3000);

    const migrationsDir = join(__dirname, '../db/migrations');
    const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    const client = await pool.connect();
    try {
        for (const file of files) {
            const sql = readFileSync(join(migrationsDir, file), 'utf8');
            console.log(`[migrate] Running ${file}…`);
            await client.query(sql);
            console.log(`[migrate] ${file} ✓`);
        }
        console.log('[migrate] All migrations done ✓');
    } catch (err) {
        console.error('[migrate] Failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
