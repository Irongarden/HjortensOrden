-- Add location fields to profiles for the member map feature
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city  TEXT,
  ADD COLUMN IF NOT EXISTS lat   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng   DOUBLE PRECISION;
