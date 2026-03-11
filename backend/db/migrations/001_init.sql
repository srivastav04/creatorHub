-- ============================================================
-- Migration 001 – Initial schema
-- Run with:  npm run migrate
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  clerk_id    TEXT        PRIMARY KEY,
  channel_ids TEXT[]      NOT NULL DEFAULT '{}',
  liked_videos TEXT[]     NOT NULL DEFAULT '{}',
  -- playlists stored as JSONB for flexibility (array of arrays)
  playlists   JSONB       NOT NULL DEFAULT '[]',
  history     TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  channel_id  TEXT        PRIMARY KEY,
  last_videos TEXT[]      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at'
  ) THEN
    CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Attach the trigger to channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'channels_updated_at'
  ) THEN
    CREATE TRIGGER channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
