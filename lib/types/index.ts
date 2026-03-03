// ─────────────────────────────────────────
// DOMAIN ENUMS
// ─────────────────────────────────────────

export type MemberRole =
  | 'admin'
  | 'chairman'
  | 'vice_chairman'
  | 'treasurer'
  | 'librarian'
  | 'member'

export type MemberStatus = 'active' | 'suspended' | 'deactivated' | 'pending'

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export type RSVPStatus = 'attending' | 'maybe' | 'not_attending'

export type PollStatus = 'active' | 'closed' | 'archived'

export type TransactionType = 'income' | 'expense'

export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export type TimelineEntryType =
  | 'founding'
  | 'chairman_transition'
  | 'major_event'
  | 'milestone'
  | 'anniversary'
  | 'other'

export type NotificationType =
  | 'event_created'
  | 'event_cancelled'
  | 'event_rsvp'
  | 'poll_created'
  | 'poll_closing'
  | 'payment_reminder'
  | 'new_member'
  | 'role_changed'
  | 'gallery_uploaded'
  | 'general'

export type AchievementType =
  | 'years_1'
  | 'years_5'
  | 'years_10'
  | 'years_15'
  | 'years_20'
  | 'perfect_attendance'
  | 'poll_master'
  | 'treasurer_award'
  | 'founder'
  | 'chairman_emeritus'

// ─────────────────────────────────────────
// DOMAIN MODELS (from DB rows + joins)
// ─────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string | null
  city: string | null
  lat: number | null
  lng: number | null
  role: MemberRole
  status: MemberStatus
  joined_at: string
  invited_by: string | null
  two_factor_enabled: boolean
  is_founder: boolean
  created_at: string
  updated_at: string
}

export interface RoleHistory {
  id: string
  user_id: string
  role: MemberRole
  assigned_by: string
  assigned_at: string
  revoked_at: string | null
  assigner?: Profile
}

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  is_recurring: boolean
  recurrence_rule: string | null
  status: EventStatus
  created_by: string
  budget_dkk: number | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  participants?: EventParticipant[]
  expenses?: EventExpense[]
  album?: GalleryAlbum
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  rsvp: RSVPStatus
  responded_at: string
  profile?: Profile
}

export interface EventExpense {
  id: string
  event_id: string
  description: string
  amount_dkk: number
  registered_by: string
  receipt_url: string | null
  created_at: string
  registrar?: Profile
}

export interface Poll {
  id: string
  title: string
  description: string | null
  options: string[]
  is_anonymous: boolean
  min_participation: number
  deadline: string
  status: PollStatus
  created_by: string
  created_at: string
  closed_at: string | null
  creator?: Profile
  votes?: PollVote[]
  results?: PollResult[]
  user_vote?: PollVote | null
}

export interface PollVote {
  id: string
  poll_id: string
  user_id: string
  option_index: number
  voted_at: string
  voter?: Profile
}

export interface PollResult {
  option_index: number
  option_text: string
  vote_count: number
  percentage: number
}

export interface TreasuryTransaction {
  id: string
  type: TransactionType
  amount_dkk: number
  description: string
  category: string | null
  event_id: string | null
  registered_by: string
  transaction_date: string
  created_at: string
  registrar?: Profile
  event?: Event
}

export interface PaymentRecord {
  id: string
  user_id: string
  amount_dkk: number
  period_month: string
  paid_at: string | null
  status: PaymentStatus
  registered_by: string | null
  created_at: string
  member?: Profile
}

export interface GalleryAlbum {
  id: string
  title: string
  description: string | null
  event_id: string | null
  event_date: string | null   // added in migration 002
  cover_image_url: string | null
  created_by: string
  created_at: string
  images?: GalleryImage[]
  event?: Event
  creator?: Profile
  image_count?: number
}

export interface GalleryImage {
  id: string
  album_id: string
  storage_path: string
  url: string
  caption: string | null
  uploaded_by: string
  featured_votes: number
  uploaded_at: string
  uploader?: Profile
  user_voted?: boolean
}

export interface TimelineEntry {
  id: string
  title: string
  description: string | null
  entry_date: string
  type: TimelineEntryType
  event_id: string | null
  images: string[] | null
  image_url: string | null   // convenience column added in migration 002
  created_by: string
  created_at: string
  event?: Event
  creator?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  action_url: string | null
  created_at: string
}

export interface AuditEntry {
  id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  actor?: Profile
}

export interface Achievement {
  id: string
  user_id: string
  type: AchievementType
  awarded_at: string
  awarded_by: string | null
}

export interface MemberInvitation {
  id: string
  email: string
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  inviter?: Profile
}

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount_dkk: number
  description: string
  category: string | null
  recurrence: 'monthly' | 'quarterly' | 'yearly'
  next_run_date: string
  last_run_date: string | null
  active: boolean
  created_by: string
  created_at: string
  creator?: Profile
}

export interface PublicInviteLink {
  id: string
  token: string
  label: string | null
  created_by: string | null
  expires_at: string
  max_uses: number | null
  uses_count: number
  active: boolean
  created_at: string
  creator?: Profile
}

export type ProposalStatus = 'draft' | 'soft' | 'full'

export type LifecycleStage =
  | 'idea'
  | 'planning'
  | 'confirmed'
  | 'archived'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus   = 'open' | 'done'
export type RSVPProposalStatus = 'attending' | 'maybe' | 'declined'

export interface ArrangementProposal {
  id: string
  title: string
  description: string | null
  type: string | null
  season: string | null
  estimated_budget: number | null
  location: string | null
  proposed_date: string | null
  notes: string | null
  publish_status: ProposalStatus
  lifecycle_stage: LifecycleStage
  created_by: string
  responsible_member_id: string | null
  budget_responsible_id: string | null
  collaborator_ids: string[]
  ai_seed: string | null
  proposed_date_from: string | null
  proposed_date_to: string | null
  location_options: string | null   // JSON: [{name, address, notes}][]
  idea_notes: string | null
  expected_participants: number | null
  max_participants: number | null
  price_per_participant: number | null
  actual_participants: number | null
  linked_event_id: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
  creator?: Profile
  responsible_member?: Profile
  budget_responsible?: Profile
}

export interface ProposalStageHistory {
  id: string
  proposal_id: string
  from_stage: LifecycleStage | null
  to_stage: LifecycleStage
  changed_by: string
  note: string | null
  created_at: string
  changer?: Profile
}

export type BudgetLineType = 'income' | 'expense'

export const BUDGET_CATEGORIES = [
  'Lokation',
  'Mad & Drikke',
  'Musik / Underholdning',
  'Udstyr',
  'Ritual / Dekoration',
  'Diverse',
] as const
export type BudgetCategory = typeof BUDGET_CATEGORIES[number]

export interface BudgetPlannedLine {
  id: string
  proposal_id: string
  line_type: BudgetLineType
  category: BudgetCategory | null
  label: string
  amount: number
  notes: string | null
  sort_order: number
  created_at: string
}

export interface BudgetActualLine {
  id: string
  proposal_id: string
  planned_line_id: string | null
  category: BudgetCategory | null
  label: string
  amount: number
  notes: string | null
  sort_order: number
  created_at: string
}

export interface ProposalTask {
  id: string
  proposal_id: string
  title: string
  assigned_to: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface ProgramSlot {
  id: string
  proposal_id: string
  slot_time: string
  title: string
  description: string | null
  responsible_id: string | null
  sort_order: number
  created_at: string
  responsible?: Profile
}

export interface ProposalEvaluation {
  id: string
  proposal_id: string
  what_worked: string | null
  what_to_improve: string | null
  rating: number | null
  repeat_as_tradition: boolean
  actual_attendees: number | null
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface ProposalAISuggestion {
  id: string
  proposal_id: string
  action_type: 'theme-ideas' | 'program-timeline' | 'budget-breakdown' | 'activities'
  prompt_seed: Record<string, unknown> | null
  response: Record<string, unknown>
  inserted_at: string | null
  created_by: string
  created_at: string
}

export interface ProposalRSVP {
  id: string
  proposal_id: string
  user_id: string
  status: RSVPProposalStatus
  responded_at: string
  member?: Profile
}

export interface ProposalAuditEntry {
  id: string
  proposal_id: string
  actor_id: string
  action: 'stage_changed' | 'budget_edited' | 'owner_changed' | 'task_changed' | 'program_changed' | 'field_updated'
  details: Record<string, unknown> | null
  created_at: string
  actor?: Profile
}

// ─────────────────────────────────────────
// UI / MISC TYPES
// ─────────────────────────────────────────

export interface TreasuryForecast {
  month: string
  expected_income: number
  projected_balance: number
}

export interface DashboardData {
  next_event: Event | null
  treasury_balance: number
  active_poll: Poll | null
  latest_image: GalleryImage | null
  recent_activity: AuditEntry[]
  upcoming_anniversaries: Array<{
    profile: Profile
    years: number
    anniversary_date: string
  }>
}

export interface AIEventSuggestion {
  title: string
  description: string
  theme: string
  estimated_budget_dkk: number
  suggested_timing: string
  reasoning: string
  similar_past_events: string[]
}

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  roles?: MemberRole[]
}

export interface SelectOption<T = string> {
  value: T
  label: string
  description?: string
}

export type SortDirection = 'asc' | 'desc'

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  meta?: PaginationMeta
}
