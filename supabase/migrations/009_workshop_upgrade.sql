-- ════════════════════════════════════════════════════════
-- HJORTENS ORDEN — Migration 009
-- Workshop Upgrade: lifecycle, budget lines, tasks,
-- program slots, evaluation, AI suggestions, audit log
-- ════════════════════════════════════════════════════════

-- ── Extend arrangement_proposals ─────────────────────

ALTER TABLE public.arrangement_proposals
  ADD COLUMN IF NOT EXISTS lifecycle_stage       TEXT NOT NULL DEFAULT 'idea'
    CHECK (lifecycle_stage IN ('idea','planning','decision','executing','evaluating','archived')),
  ADD COLUMN IF NOT EXISTS responsible_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_participants  INTEGER,
  ADD COLUMN IF NOT EXISTS max_participants       INTEGER,
  ADD COLUMN IF NOT EXISTS price_per_participant  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_participants    INTEGER;

-- ── Stage History ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_stage_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  from_stage   TEXT,
  to_stage     TEXT NOT NULL,
  changed_by   UUID NOT NULL REFERENCES public.profiles(id),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_history_select" ON public.proposal_stage_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids) OR ap.publish_status IN ('soft','full'))
    )
  );

CREATE POLICY "stage_history_insert" ON public.proposal_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- ── Budget Planned Lines ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_budget_planned (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  line_type    TEXT NOT NULL DEFAULT 'expense' CHECK (line_type IN ('income','expense')),
  category     TEXT,   -- Location, Food & Drink, Music, Equipment, Ritual/Decor, Misc
  label        TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_budget_planned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_planned_select" ON public.proposal_budget_planned
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  );

CREATE POLICY "budget_planned_write" ON public.proposal_budget_planned
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  );

-- ── Budget Actual Lines ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_budget_actual (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  planned_line_id UUID REFERENCES public.proposal_budget_planned(id) ON DELETE SET NULL,
  category        TEXT,
  label           TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_budget_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_actual_select" ON public.proposal_budget_actual
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  );

CREATE POLICY "budget_actual_write" ON public.proposal_budget_actual
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids)
             OR public.has_min_role('treasurer'))
    )
  );

-- ── Tasks ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  assigned_to  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     DATE,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.proposal_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids) OR ap.publish_status IN ('soft','full'))
    )
  );

CREATE POLICY "tasks_write" ON public.proposal_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  );

-- ── Program Slots ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_program_slots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  slot_time      TEXT NOT NULL,   -- e.g. "18:00" — stored as text for flexibility
  title          TEXT NOT NULL,
  description    TEXT,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_program_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_select" ON public.proposal_program_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids) OR ap.publish_status IN ('soft','full'))
    )
  );

CREATE POLICY "program_write" ON public.proposal_program_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  );

-- ── Evaluation ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_evaluations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id          UUID NOT NULL UNIQUE REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  what_worked          TEXT,
  what_to_improve      TEXT,
  rating               INTEGER CHECK (rating BETWEEN 1 AND 5),
  repeat_as_tradition  BOOLEAN NOT NULL DEFAULT FALSE,
  actual_attendees     INTEGER,
  submitted_by         UUID NOT NULL REFERENCES public.profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluation_select" ON public.proposal_evaluations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids) OR ap.publish_status = 'full')
    )
  );

CREATE POLICY "evaluation_write" ON public.proposal_evaluations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  );

-- ── AI Suggestions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_ai_suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL, -- 'theme-ideas','program-timeline','budget-breakdown','activities'
  prompt_seed  JSONB,         -- context that was sent (sanitized, no PII)
  response     JSONB NOT NULL,
  inserted_at  TIMESTAMPTZ,  -- set when user clicks "Insert"
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_suggestions_access" ON public.proposal_ai_suggestions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids))
    )
  );

-- ── Proposal Audit Log ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES public.profiles(id),
  action      TEXT NOT NULL,  -- 'stage_changed','budget_edited','owner_changed','task_changed','program_changed','field_updated'
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposal_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin/chairman/vice/treasurer + proposal owners can read audit log
CREATE POLICY "audit_log_select" ON public.proposal_audit_log
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.has_min_role('treasurer')
    OR EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id AND ap.created_by = auth.uid()
    )
  );

CREATE POLICY "audit_log_insert" ON public.proposal_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ── Indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_proposal    ON public.proposal_tasks(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_assigned    ON public.proposal_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_proposal_budget_pl_prop    ON public.proposal_budget_planned(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_budget_ac_prop    ON public.proposal_budget_actual(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_program_prop      ON public.proposal_program_slots(proposal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_proposal_ai_prop           ON public.proposal_ai_suggestions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_audit_prop        ON public.proposal_audit_log(proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_stage_hist_prop   ON public.proposal_stage_history(proposal_id);

-- ── RSVP table for proposals ──────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_rsvp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.arrangement_proposals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'maybe' CHECK (status IN ('attending','maybe','declined')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proposal_id, user_id)
);

ALTER TABLE public.proposal_rsvp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvp_select" ON public.proposal_rsvp
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arrangement_proposals ap
      WHERE ap.id = proposal_id
        AND (ap.created_by = auth.uid() OR auth.uid() = ANY(ap.collaborator_ids) OR ap.publish_status IN ('soft','full'))
    )
  );

CREATE POLICY "rsvp_own" ON public.proposal_rsvp
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
