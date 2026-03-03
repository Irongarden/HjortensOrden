-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Treasury settings (monthly member fee)
-- Migration: 012_monthly_fee_setting.sql
-- ════════════════════════════════════════════════════════

-- ── treasury_settings ─────────────────────────────────
-- Single-row settings table for treasurer-managed values.
CREATE TABLE IF NOT EXISTS public.treasury_settings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_fee_dkk NUMERIC(10,2) NOT NULL DEFAULT 300,
  updated_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed exactly one default row if the table is empty
INSERT INTO public.treasury_settings (monthly_fee_dkk)
SELECT 300
WHERE NOT EXISTS (SELECT 1 FROM public.treasury_settings);

-- ── Row Level Security ────────────────────────────────
ALTER TABLE public.treasury_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the current fee
CREATE POLICY "treasury_settings_select"
  ON public.treasury_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only treasurer-level+ roles may update
CREATE POLICY "treasury_settings_update"
  ON public.treasury_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'chairman', 'vice_chairman', 'treasurer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'chairman', 'vice_chairman', 'treasurer')
    )
  );
