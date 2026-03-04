-- ── Migration 015: Payment Reminder Log ─────────────────────────────────────
-- Tracks every time a kontingent-påmindelsesmail was sent, per recipient.
-- This lets the kasserer see "Sidst påmindet: X dage siden" pr. ubetalt medlem.

CREATE TABLE IF NOT EXISTS public.payment_reminder_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month  TEXT        NOT NULL,                                   -- e.g. '2026-03'
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_reminder_log_month_user
  ON public.payment_reminder_log(period_month, user_id, sent_at DESC);

-- RLS: active members can read (kasserer needs to see it on the page)
ALTER TABLE public.payment_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_members_view_reminder_log"
  ON public.payment_reminder_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Only service-role key may insert (API routes only, no direct client writes)
