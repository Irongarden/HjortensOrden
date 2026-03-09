-- ══════════════════════════════════════════════════════════════════
-- Migration 016: Open INSERT/UPDATE to all members
--
-- Previously timeline, events, and polls required librarian or
-- vice_chairman to create content. All authenticated members
-- should be able to create these records — privileged roles can
-- still update/delete anything, while members can edit their own.
-- ══════════════════════════════════════════════════════════════════

-- ── TIMELINE ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "timeline_insert_librarian" ON public.timeline_entries;
DROP POLICY IF EXISTS "timeline_update_librarian" ON public.timeline_entries;
DROP POLICY IF EXISTS "timeline_delete_chairman"  ON public.timeline_entries;

CREATE POLICY "timeline_insert_members" ON public.timeline_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('member'));

CREATE POLICY "timeline_update_members" ON public.timeline_entries
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('librarian'));

CREATE POLICY "timeline_delete_members" ON public.timeline_entries
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('chairman'));

-- ── EVENTS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "events_insert_privileged" ON public.events;
DROP POLICY IF EXISTS "events_update_privileged" ON public.events;
DROP POLICY IF EXISTS "events_delete_chairman"   ON public.events;

CREATE POLICY "events_insert_members" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('member'));

CREATE POLICY "events_update_members" ON public.events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('vice_chairman'));

CREATE POLICY "events_delete_members" ON public.events
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('chairman'));

-- ── POLLS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "polls_insert_privileged" ON public.polls;
DROP POLICY IF EXISTS "polls_update_privileged" ON public.polls;

CREATE POLICY "polls_insert_members" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('member'));

CREATE POLICY "polls_update_members" ON public.polls
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('vice_chairman'));
