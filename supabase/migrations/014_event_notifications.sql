-- ── Migration 014: Event Notifications Log ──────────────────────────────────
-- Tracks every time a batch e-mail / in-app notification was sent for an event.
-- Used for rate-limiting (max once per 7 days per event) and the audit log UI.

-- 1. Extend the notification_type enum so we can use 'event_reminder' for
--    manually triggered reminders (distinct from 'event_created' on first publish).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_reminder';

-- 2. Create the log table
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sent_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INT         NOT NULL DEFAULT 0,
  -- 'auto_publish' = triggered automatically when event status → published
  -- 'manual'       = triggered by an admin/creator from the event detail page
  trigger_type    TEXT        NOT NULL DEFAULT 'manual'
                              CHECK (trigger_type IN ('auto_publish', 'manual'))
);

CREATE INDEX idx_event_notifications_event
  ON public.event_notifications(event_id, sent_at DESC);

-- 3. Row-Level Security
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- All active members can view the log (for transparency on the detail page)
CREATE POLICY "active_members_view_event_notifications"
  ON public.event_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Only the service-role key (used by API routes) may insert / update / delete.
-- No direct client-side mutations allowed.
