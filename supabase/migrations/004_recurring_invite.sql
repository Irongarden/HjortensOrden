-- ─────────────────────────────────────────
-- 004_recurring_invite.sql
-- ─────────────────────────────────────────

-- Recurring / scheduled transactions
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type          text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_dkk    numeric(10,2) NOT NULL,
  description   text NOT NULL,
  category      text,
  recurrence    text NOT NULL DEFAULT 'monthly'
                CHECK (recurrence IN ('monthly', 'quarterly', 'yearly')),
  next_run_date date NOT NULL,
  last_run_date date,
  active        boolean NOT NULL DEFAULT true,
  created_by    uuid NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Public invite links (anyone with the link can request membership)
CREATE TABLE IF NOT EXISTS public.public_invite_links (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token       text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label       text,
  created_by  uuid REFERENCES public.profiles(id),
  expires_at  timestamptz NOT NULL,
  max_uses    int,
  uses_count  int NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);
