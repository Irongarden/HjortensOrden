-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 007
-- Add is_founder flag to profiles
-- ════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_founder IS 'True if this member was a founding member of the order';
