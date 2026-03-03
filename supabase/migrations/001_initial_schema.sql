-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — COMPLETE DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────
-- uuid-ossp not needed; using gen_random_uuid() (built-in pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ── Custom ENUM types ──────────────────────────────────
CREATE TYPE member_role AS ENUM (
  'admin', 'chairman', 'vice_chairman', 'treasurer', 'librarian', 'member'
);

CREATE TYPE member_status AS ENUM (
  'active', 'suspended', 'deactivated', 'pending'
);

CREATE TYPE event_status AS ENUM (
  'draft', 'published', 'cancelled', 'completed'
);

CREATE TYPE rsvp_status AS ENUM (
  'attending', 'maybe', 'not_attending'
);

CREATE TYPE poll_status AS ENUM (
  'active', 'closed', 'archived'
);

CREATE TYPE transaction_type AS ENUM (
  'income', 'expense'
);

CREATE TYPE payment_status AS ENUM (
  'paid', 'pending', 'overdue'
);

CREATE TYPE timeline_entry_type AS ENUM (
  'founding', 'chairman_transition', 'major_event', 'milestone', 'anniversary', 'other'
);

CREATE TYPE notification_type AS ENUM (
  'event_created', 'event_cancelled', 'event_rsvp', 'poll_created', 'poll_closing',
  'payment_reminder', 'new_member', 'role_changed', 'gallery_uploaded', 'general'
);

CREATE TYPE achievement_type AS ENUM (
  'years_1', 'years_5', 'years_10', 'years_15', 'years_20',
  'perfect_attendance', 'poll_master', 'treasurer_award', 'founder', 'chairman_emeritus'
);

-- ═══════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  avatar_url          TEXT,
  phone               TEXT,
  bio                 TEXT,
  role                member_role NOT NULL DEFAULT 'member',
  status              member_status NOT NULL DEFAULT 'active',
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Role History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        member_role NOT NULL,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- ── Member Invitations ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  invited_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE string
  status          event_status NOT NULL DEFAULT 'draft',
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  budget_dkk      NUMERIC(10,2),
  cover_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_ends_after_starts CHECK (ends_at >= starts_at)
);

-- ── Event Participants ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rsvp         rsvp_status NOT NULL DEFAULT 'maybe',
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- ── Event Expenses ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  amount_dkk      NUMERIC(10,2) NOT NULL CHECK (amount_dkk > 0),
  registered_by   UUID NOT NULL REFERENCES public.profiles(id),
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Polls ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.polls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  options           JSONB NOT NULL, -- string[]
  is_anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
  min_participation INTEGER NOT NULL DEFAULT 0,
  deadline          TIMESTAMPTZ NOT NULL,
  status            poll_status NOT NULL DEFAULT 'active',
  created_by        UUID NOT NULL REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  CONSTRAINT polls_min_participation_non_negative CHECK (min_participation >= 0)
);

-- ── Poll Votes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id) -- one vote per member per poll
);

-- ── Treasury Transactions ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.treasury_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             transaction_type NOT NULL,
  amount_dkk       NUMERIC(10,2) NOT NULL CHECK (amount_dkk > 0),
  description      TEXT NOT NULL,
  category         TEXT,
  event_id         UUID REFERENCES public.events(id) ON DELETE SET NULL,
  registered_by    UUID NOT NULL REFERENCES public.profiles(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payment Records ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_dkk      NUMERIC(10,2) NOT NULL DEFAULT 300,
  period_month    CHAR(7) NOT NULL, -- 'YYYY-MM'
  paid_at         TIMESTAMPTZ,
  status          payment_status NOT NULL DEFAULT 'pending',
  registered_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_month)
);

-- ── Gallery Albums ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_albums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_id        UUID REFERENCES public.events(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Gallery Images ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id       UUID NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  url            TEXT NOT NULL,
  caption        TEXT,
  uploaded_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  featured_votes INTEGER NOT NULL DEFAULT 0,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Gallery Featured Votes ────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_featured_votes (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year     INTEGER NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year) -- one featured vote per member per year
);

-- ── Timeline Entries ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timeline_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  entry_date  DATE NOT NULL,
  type        timeline_entry_type NOT NULL DEFAULT 'other',
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  images      TEXT[], -- array of storage paths
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       notification_type NOT NULL DEFAULT 'general',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Achievements ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       achievement_type NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (user_id, type)
);

-- ═══════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.treasury_balance AS
SELECT
  COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_dkk ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_dkk ELSE 0 END), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_dkk
                    WHEN type = 'expense' THEN -amount_dkk END), 0)       AS balance
FROM public.treasury_transactions;

CREATE OR REPLACE VIEW public.member_payment_status AS
SELECT
  p.id AS user_id,
  p.full_name,
  COUNT(pr.id) FILTER (WHERE pr.status IN ('pending','overdue')) AS months_outstanding,
  COALESCE(SUM(pr.amount_dkk) FILTER (WHERE pr.status IN ('pending','overdue')), 0) AS total_outstanding_dkk
FROM public.profiles p
LEFT JOIN public.payment_records pr ON pr.user_id = p.id
WHERE p.status = 'active'
GROUP BY p.id, p.full_name;

-- ═══════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════

CREATE INDEX idx_events_starts_at           ON public.events(starts_at);
CREATE INDEX idx_events_status              ON public.events(status);
CREATE INDEX idx_event_participants_event   ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user    ON public.event_participants(user_id);
CREATE INDEX idx_poll_votes_poll            ON public.poll_votes(poll_id);
CREATE INDEX idx_treasury_transactions_date ON public.treasury_transactions(transaction_date DESC);
CREATE INDEX idx_payment_records_period     ON public.payment_records(period_month);
CREATE INDEX idx_payment_records_user       ON public.payment_records(user_id);
CREATE INDEX idx_gallery_images_album       ON public.gallery_images(album_id);
CREATE INDEX idx_notifications_user         ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_audit_log_actor            ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_entity           ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_timeline_entries_date      ON public.timeline_entries(entry_date DESC);

-- Full-text search indexes
CREATE INDEX idx_events_search     ON public.events USING gin(to_tsvector('danish', title || ' ' || COALESCE(description,'')));
CREATE INDEX idx_profiles_search   ON public.profiles USING gin(to_tsvector('danish', full_name || ' ' || COALESCE(bio,'')));
CREATE INDEX idx_timeline_search   ON public.timeline_entries USING gin(to_tsvector('danish', title || ' ' || COALESCE(description,'')));

-- ═══════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update featured_votes count on gallery_featured_votes insert/delete
CREATE OR REPLACE FUNCTION public.update_featured_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gallery_images SET featured_votes = featured_votes + 1 WHERE id = NEW.image_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gallery_images SET featured_votes = GREATEST(featured_votes - 1, 0) WHERE id = OLD.image_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_featured_votes_count
  AFTER INSERT OR DELETE ON public.gallery_featured_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_featured_votes_count();

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_featured_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements          ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user has minimum role
CREATE OR REPLACE FUNCTION public.has_min_role(min_role member_role)
RETURNS BOOLEAN AS $$
  SELECT CASE auth_role()
    WHEN 'admin'         THEN true
    WHEN 'chairman'      THEN min_role IN ('chairman','vice_chairman','treasurer','librarian','member')
    WHEN 'vice_chairman' THEN min_role IN ('vice_chairman','treasurer','librarian','member')
    WHEN 'treasurer'     THEN min_role IN ('treasurer','librarian','member')
    WHEN 'librarian'     THEN min_role IN ('librarian','member')
    WHEN 'member'        THEN min_role = 'member'
    ELSE false
  END
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES RLS ──────────────────────────────────────
-- Any authenticated member can read profiles
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Members can update their own profile (non-role/status fields)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin / chairman / vice_chairman can update any profile
CREATE POLICY "profiles_update_privileged" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_min_role('vice_chairman'))
  WITH CHECK (public.has_min_role('vice_chairman'));

-- ── ROLE HISTORY RLS ─────────────────────────────────
CREATE POLICY "role_history_read" ON public.role_history
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "role_history_insert_privileged" ON public.role_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('vice_chairman'));

-- ── INVITATIONS RLS ───────────────────────────────────
CREATE POLICY "invitations_read_privileged" ON public.member_invitations
  FOR SELECT TO authenticated
  USING (public.has_min_role('vice_chairman') OR invited_by = auth.uid());

CREATE POLICY "invitations_insert_privileged" ON public.member_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('vice_chairman'));

-- ── EVENTS RLS ────────────────────────────────────────
CREATE POLICY "events_read_members" ON public.events
  FOR SELECT TO authenticated
  USING (status != 'draft' OR created_by = auth.uid() OR public.has_min_role('vice_chairman'));

CREATE POLICY "events_insert_privileged" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('vice_chairman'));

CREATE POLICY "events_update_privileged" ON public.events
  FOR UPDATE TO authenticated
  USING (public.has_min_role('vice_chairman') OR created_by = auth.uid());

CREATE POLICY "events_delete_chairman" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_min_role('chairman'));

-- ── EVENT PARTICIPANTS RLS ───────────────────────────
CREATE POLICY "participants_read" ON public.event_participants
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "participants_upsert_own" ON public.event_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_update_own" ON public.event_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── EVENT EXPENSES RLS ───────────────────────────────
CREATE POLICY "expenses_read_treasurer" ON public.event_expenses
  FOR SELECT TO authenticated
  USING (public.has_min_role('treasurer'));

CREATE POLICY "expenses_insert_treasurer" ON public.event_expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('treasurer'));

-- ── POLLS RLS ────────────────────────────────────────
CREATE POLICY "polls_read_members" ON public.polls
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "polls_insert_privileged" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('vice_chairman'));

CREATE POLICY "polls_update_privileged" ON public.polls
  FOR UPDATE TO authenticated
  USING (public.has_min_role('vice_chairman') OR created_by = auth.uid());

-- ── POLL VOTES RLS ───────────────────────────────────
-- Anonymous polls: voters can only see their own vote
CREATE POLICY "poll_votes_read" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    NOT (SELECT is_anonymous FROM public.polls WHERE id = poll_id)
  );

CREATE POLICY "poll_votes_insert" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── TREASURY RLS ─────────────────────────────────────
CREATE POLICY "treasury_read_treasurer" ON public.treasury_transactions
  FOR SELECT TO authenticated
  USING (public.has_min_role('treasurer'));

CREATE POLICY "treasury_insert_treasurer" ON public.treasury_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('treasurer'));

-- ── PAYMENT RECORDS RLS ──────────────────────────────
CREATE POLICY "payments_read_treasurer_or_own" ON public.payment_records
  FOR SELECT TO authenticated
  USING (public.has_min_role('treasurer') OR user_id = auth.uid());

CREATE POLICY "payments_insert_treasurer" ON public.payment_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('treasurer'));

CREATE POLICY "payments_update_treasurer" ON public.payment_records
  FOR UPDATE TO authenticated
  USING (public.has_min_role('treasurer'));

-- ── GALLERY RLS ──────────────────────────────────────
CREATE POLICY "albums_read_members" ON public.gallery_albums
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "albums_insert_members" ON public.gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('member'));

CREATE POLICY "albums_manage_librarian" ON public.gallery_albums
  FOR UPDATE TO authenticated
  USING (public.has_min_role('librarian') OR created_by = auth.uid());

CREATE POLICY "images_read_members" ON public.gallery_images
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "images_insert_members" ON public.gallery_images
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('member'));

CREATE POLICY "images_delete_own_or_librarian" ON public.gallery_images
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_min_role('librarian'));

CREATE POLICY "featured_votes_read" ON public.gallery_featured_votes
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "featured_votes_insert" ON public.gallery_featured_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── TIMELINE RLS ─────────────────────────────────────
CREATE POLICY "timeline_read_members" ON public.timeline_entries
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "timeline_insert_librarian" ON public.timeline_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('librarian'));

CREATE POLICY "timeline_update_librarian" ON public.timeline_entries
  FOR UPDATE TO authenticated
  USING (public.has_min_role('librarian') OR created_by = auth.uid());

CREATE POLICY "timeline_delete_chairman" ON public.timeline_entries
  FOR DELETE TO authenticated
  USING (public.has_min_role('chairman'));

-- ── NOTIFICATIONS RLS ────────────────────────────────
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── AUDIT LOG RLS ────────────────────────────────────
CREATE POLICY "audit_read_privileged" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_min_role('vice_chairman'));

-- Only service role can insert into audit_log
CREATE POLICY "audit_insert_service" ON public.audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ── ACHIEVEMENTS RLS ─────────────────────────────────
CREATE POLICY "achievements_read_members" ON public.achievements
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "achievements_insert_privileged" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('vice_chairman'));

-- ═══════════════════════════════════════════════════════
-- FULL-TEXT SEARCH FUNCTION
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_all(query TEXT)
RETURNS TABLE (
  type    TEXT,
  id      UUID,
  title   TEXT,
  snippet TEXT,
  url     TEXT
) AS $$
BEGIN
  -- Search events
  RETURN QUERY
  SELECT 'event'::TEXT, e.id, e.title,
    LEFT(COALESCE(e.description, ''), 120) AS snippet,
    ('/events/' || e.id)::TEXT AS url
  FROM public.events e
  WHERE to_tsvector('danish', e.title || ' ' || COALESCE(e.description,''))
        @@ plainto_tsquery('danish', query)
  LIMIT 5;

  -- Search profiles
  RETURN QUERY
  SELECT 'member'::TEXT, p.id, p.full_name,
    (p.role::TEXT || ' · Tilmeldt ' || to_char(p.joined_at, 'YYYY')) AS snippet,
    ('/members/' || p.id)::TEXT AS url
  FROM public.profiles p
  WHERE to_tsvector('danish', p.full_name || ' ' || COALESCE(p.bio,''))
        @@ plainto_tsquery('danish', query)
  LIMIT 5;

  -- Search timeline
  RETURN QUERY
  SELECT 'timeline'::TEXT, t.id, t.title,
    LEFT(COALESCE(t.description,''), 120) AS snippet,
    '/timeline'::TEXT AS url
  FROM public.timeline_entries t
  WHERE to_tsvector('danish', t.title || ' ' || COALESCE(t.description,''))
        @@ plainto_tsquery('danish', query)
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
