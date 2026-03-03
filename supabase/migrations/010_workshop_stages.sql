-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 010
-- Simplify lifecycle stages (6 → 4), add calendar link,
-- add lat/lng for map pins
-- ════════════════════════════════════════════════════════

-- ── Drop old CHECK constraint FIRST so UPDATEs below are allowed ─────────────
ALTER TABLE public.arrangement_proposals
  DROP CONSTRAINT IF EXISTS arrangement_proposals_lifecycle_stage_check;

-- ── Migrate existing stage values ────────────────────────────────────────────
UPDATE public.arrangement_proposals
  SET lifecycle_stage = 'planning'
  WHERE lifecycle_stage = 'decision';

UPDATE public.arrangement_proposals
  SET lifecycle_stage = 'confirmed'
  WHERE lifecycle_stage IN ('executing', 'evaluating');

-- ── Add new CHECK constraint (4 stages) ──────────────────────────────────────
ALTER TABLE public.arrangement_proposals
  ADD CONSTRAINT arrangement_proposals_lifecycle_stage_check
    CHECK (lifecycle_stage IN ('idea', 'planning', 'confirmed', 'archived'));

-- ── Add linked event + map coordinates ───────────────────────────────────────
ALTER TABLE public.arrangement_proposals
  ADD COLUMN IF NOT EXISTS linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lat             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng             DOUBLE PRECISION;
