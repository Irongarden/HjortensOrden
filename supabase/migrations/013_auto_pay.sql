-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Auto-pay flag on profiles
-- Migration: 013_auto_pay.sql
-- ════════════════════════════════════════════════════════
--
-- Allows the treasurer to mark members who reliably pay
-- their monthly fee on time. Auto-pay members can be
-- registered in bulk with the "Kør auto" button.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_pay BOOLEAN NOT NULL DEFAULT false;
