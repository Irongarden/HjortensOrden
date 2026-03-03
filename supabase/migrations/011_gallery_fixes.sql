-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 011
-- Fix missing DELETE policy on gallery_albums
-- ════════════════════════════════════════════════════════

-- The original schema only had a FOR UPDATE policy for albums.
-- A FOR DELETE policy was missing, causing album deletes to
-- silently fail (RLS blocks without returning an error).

CREATE POLICY "albums_delete_own_or_librarian" ON public.gallery_albums
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_min_role('librarian'));
