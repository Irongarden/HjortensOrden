-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 006
-- Arrangement Proposals for the Inspiration Workshop
-- Also applies profile location columns if not already present
-- ════════════════════════════════════════════════════════

-- Ensure location columns exist (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;

-- ── Arrangement Proposals ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.arrangement_proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  type             TEXT,
  season           TEXT,
  estimated_budget NUMERIC(10,2),
  location         TEXT,
  proposed_date    TEXT,
  notes            TEXT,
  publish_status   TEXT NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'soft', 'full')),
  created_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaborator_ids UUID[] NOT NULL DEFAULT '{}',
  ai_seed          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.arrangement_proposals ENABLE ROW LEVEL SECURITY;

-- Everyone can read soft/full published proposals.
-- Only creator and collaborators can read drafts.
CREATE POLICY "proposals_read" ON public.arrangement_proposals
  FOR SELECT TO authenticated
  USING (
    publish_status IN ('soft', 'full')
    OR created_by = auth.uid()
    OR auth.uid() = ANY(collaborator_ids)
  );

CREATE POLICY "proposals_insert" ON public.arrangement_proposals
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_min_role('member'));

CREATE POLICY "proposals_update" ON public.arrangement_proposals
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR auth.uid() = ANY(collaborator_ids));

CREATE POLICY "proposals_delete" ON public.arrangement_proposals
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('admin'));
