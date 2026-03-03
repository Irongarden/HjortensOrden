-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 002
-- Add missing columns to align DB with frontend
-- ════════════════════════════════════════════════════════

-- Add event_date to gallery_albums (the frontend uses this for display)
ALTER TABLE public.gallery_albums
  ADD COLUMN IF NOT EXISTS event_date DATE;

-- Add image_url convenience column to timeline_entries
-- (frontend stores a single image URL; images[] is the canonical store)
ALTER TABLE public.timeline_entries
  ADD COLUMN IF NOT EXISTS image_url TEXT;
