-- ============================================================
-- Migration 002 – Channel polling / priority tracking
-- Adds fields for batch-based n8n polling instead of full scan.
-- Run with:  npm run migrate
-- ============================================================

-- Add new tracking columns to channels
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS last_video_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_checked_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_priority   INTEGER     NOT NULL DEFAULT 1;

-- Index for the batch-query: unchecked channels ordered by priority
CREATE INDEX IF NOT EXISTS idx_channels_check_priority
  ON channels (last_checked_at, check_priority DESC);
