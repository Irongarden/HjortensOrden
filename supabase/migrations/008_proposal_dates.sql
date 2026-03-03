-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 008
-- Add real date columns to arrangement_proposals
-- ════════════════════════════════════════════════════════

ALTER TABLE public.arrangement_proposals
  ADD COLUMN IF NOT EXISTS proposed_date_from DATE,
  ADD COLUMN IF NOT EXISTS proposed_date_to   DATE,
  ADD COLUMN IF NOT EXISTS location_options   TEXT,   -- JSON array of {name, address, notes}
  ADD COLUMN IF NOT EXISTS idea_notes         TEXT;   -- Rich idea board notes (markdown)
