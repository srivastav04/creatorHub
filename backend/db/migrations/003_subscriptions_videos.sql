-- ============================================================
-- Migration 003 – Subscriptions + Videos tables
-- Normalises user↔channel subscriptions into its own table,
-- adds a videos table for storing detected videos, and
-- enriches the channels table with metadata fields.
-- Run with:  npm run migrate
-- ============================================================

-- 1. Add metadata columns to channels (name, avatar, subscriber_count)
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS name             TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT NULL;

-- 2. Add email column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- 3. Subscriptions join table  (user ↔ channel, many-to-many)
-- Each row = one subscription. Replaces the channel_ids TEXT[] column in users.
CREATE TABLE IF NOT EXISTS subscriptions (
  id         SERIAL       PRIMARY KEY,
  user_id    TEXT         NOT NULL REFERENCES users(clerk_id) ON DELETE CASCADE,
  channel_id TEXT         NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- No duplicate subscriptions
  UNIQUE (user_id, channel_id)
);

-- Fast lookup: "who is subscribed to channel X?" (for notifications)
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel
  ON subscriptions(channel_id);

-- Fast lookup: "what channels does user Y follow?" (for feed)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON subscriptions(user_id);

-- 4. Videos table (stores metadata when n8n detects a new video)
CREATE TABLE IF NOT EXISTS videos (
  video_id     TEXT        PRIMARY KEY,
  channel_id   TEXT        NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  title        TEXT,
  url          TEXT,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to fetch all videos for a channel sorted by publish date
CREATE INDEX IF NOT EXISTS idx_videos_channel
  ON videos(channel_id, published_at DESC);
