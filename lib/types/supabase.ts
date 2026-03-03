// ─────────────────────────────────────────
// SUPABASE DATABASE TYPES
// Auto-generate with: npm run db:types
// ─────────────────────────────────────────

import type {
  MemberRole, MemberStatus, EventStatus, RSVPStatus, PollStatus,
  TransactionType, PaymentStatus, TimelineEntryType, NotificationType, AchievementType,
} from './index'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Row type aliases (defined outside Database to avoid circular Omit<> references) ───

type ProfilesRow = {
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
  created_at: string
  updated_at: string
}

type RoleHistoryRow = {
  id: string
  user_id: string
  role: MemberRole
  assigned_by: string
  assigned_at: string
  revoked_at: string | null
}

type EventsRow = {
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
}

type EventParticipantsRow = {
  id: string
  event_id: string
  user_id: string
  rsvp: RSVPStatus
  responded_at: string
}

type EventExpensesRow = {
  id: string
  event_id: string
  description: string
  amount_dkk: number
  registered_by: string
  receipt_url: string | null
  created_at: string
}

type PollsRow = {
  id: string
  title: string
  description: string | null
  options: Json
  is_anonymous: boolean
  min_participation: number
  deadline: string
  status: PollStatus
  created_by: string
  created_at: string
  closed_at: string | null
}

type PollVotesRow = {
  id: string
  poll_id: string
  user_id: string
  option_index: number
  voted_at: string
}

type TreasuryTransactionsRow = {
  id: string
  type: TransactionType
  amount_dkk: number
  description: string
  category: string | null
  event_id: string | null
  registered_by: string
  transaction_date: string
  created_at: string
}

type PaymentRecordsRow = {
  id: string
  user_id: string
  amount_dkk: number
  period_month: string
  paid_at: string | null
  status: PaymentStatus
  registered_by: string | null
  created_at: string
}

type GalleryAlbumsRow = {
  id: string
  title: string
  description: string | null
  event_id: string | null
  event_date: string | null
  cover_image_url: string | null
  created_by: string
  created_at: string
}

type GalleryImagesRow = {
  id: string
  album_id: string
  storage_path: string
  url: string
  caption: string | null
  uploaded_by: string
  featured_votes: number
  uploaded_at: string
}

type GalleryFeaturedVotesRow = {
  id: string
  image_id: string
  user_id: string
  year: number
  voted_at: string
}

type TimelineEntriesRow = {
  id: string
  title: string
  description: string | null
  entry_date: string
  type: TimelineEntryType
  event_id: string | null
  images: string[] | null
  image_url: string | null
  created_by: string
  created_at: string
}

type NotificationsRow = {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  action_url: string | null
  created_at: string
}

type AuditLogRow = {
  id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Json | null
  ip_address: string | null
  created_at: string
}

type AchievementsRow = {
  id: string
  user_id: string
  type: AchievementType
  awarded_at: string
  awarded_by: string | null
}

type MemberInvitationsRow = {
  id: string
  email: string
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

type RecurringTransactionsRow = {
  id: string
  type: string
  amount_dkk: number
  description: string
  category: string | null
  recurrence: string
  next_run_date: string
  last_run_date: string | null
  active: boolean
  created_by: string
  created_at: string
}

type PublicInviteLinksRow = {
  id: string
  token: string
  label: string | null
  created_by: string | null
  expires_at: string
  max_uses: number | null
  uses_count: number
  active: boolean
  created_at: string
}

// ─── Database type ───────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: Omit<ProfilesRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProfilesRow, 'created_at' | 'updated_at'>>
        Relationships: []
      }
      role_history: {
        Row: RoleHistoryRow
        Insert: Omit<RoleHistoryRow, 'id'>
        Update: Partial<Omit<RoleHistoryRow, 'id'>>
        Relationships: []
      }
      events: {
        Row: EventsRow
        Insert: Omit<EventsRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EventsRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      event_participants: {
        Row: EventParticipantsRow
        Insert: Omit<EventParticipantsRow, 'id'>
        Update: Partial<Omit<EventParticipantsRow, 'id'>>
        Relationships: []
      }
      event_expenses: {
        Row: EventExpensesRow
        Insert: Omit<EventExpensesRow, 'id' | 'created_at'>
        Update: Partial<Omit<EventExpensesRow, 'id' | 'created_at'>>
        Relationships: []
      }
      polls: {
        Row: PollsRow
        Insert: Omit<PollsRow, 'id' | 'created_at'>
        Update: Partial<Omit<PollsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      poll_votes: {
        Row: PollVotesRow
        Insert: Omit<PollVotesRow, 'id'>
        Update: Partial<Omit<PollVotesRow, 'id'>>
        Relationships: []
      }
      treasury_transactions: {
        Row: TreasuryTransactionsRow
        Insert: Omit<TreasuryTransactionsRow, 'id' | 'created_at'>
        Update: Partial<Omit<TreasuryTransactionsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      payment_records: {
        Row: PaymentRecordsRow
        Insert: Omit<PaymentRecordsRow, 'id' | 'created_at'>
        Update: Partial<Omit<PaymentRecordsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      gallery_albums: {
        Row: GalleryAlbumsRow
        Insert: Omit<GalleryAlbumsRow, 'id' | 'created_at'>
        Update: Partial<Omit<GalleryAlbumsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      gallery_images: {
        Row: GalleryImagesRow
        Insert: Omit<GalleryImagesRow, 'id' | 'featured_votes'>
        Update: Partial<Omit<GalleryImagesRow, 'id' | 'featured_votes'>>
        Relationships: []
      }
      gallery_featured_votes: {
        Row: GalleryFeaturedVotesRow
        Insert: Omit<GalleryFeaturedVotesRow, 'id'>
        Update: Record<string, never>
        Relationships: []
      }
      timeline_entries: {
        Row: TimelineEntriesRow
        Insert: Omit<TimelineEntriesRow, 'id' | 'created_at'>
        Update: Partial<Omit<TimelineEntriesRow, 'id' | 'created_at'>>
        Relationships: []
      }
      notifications: {
        Row: NotificationsRow
        Insert: Omit<NotificationsRow, 'id' | 'created_at' | 'read'>
        Update: Partial<Omit<NotificationsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      audit_log: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'created_at'>
        Update: Record<string, never>
        Relationships: []
      }
      achievements: {
        Row: AchievementsRow
        Insert: Omit<AchievementsRow, 'id'>
        Update: Record<string, never>
        Relationships: []
      }
      member_invitations: {
        Row: MemberInvitationsRow
        Insert: Omit<MemberInvitationsRow, 'id' | 'created_at'>
        Update: Partial<Omit<MemberInvitationsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      recurring_transactions: {
        Row: RecurringTransactionsRow
        Insert: Omit<RecurringTransactionsRow, 'id' | 'created_at'>
        Update: Partial<Omit<RecurringTransactionsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      public_invite_links: {
        Row: PublicInviteLinksRow
        Insert: Omit<PublicInviteLinksRow, 'id' | 'created_at' | 'uses_count'>
        Update: Partial<Omit<PublicInviteLinksRow, 'id' | 'created_at' | 'uses_count'>>
        Relationships: []
      }
    }
    Views: {
      treasury_balance: {
        Row: {
          total_income: number
          total_expenses: number
          balance: number
        }
        Relationships: []
      }
      member_payment_status: {
        Row: {
          user_id: string
          full_name: string
          months_outstanding: number
          total_outstanding_dkk: number
        }
        Relationships: []
      }
    }
    Functions: {
      get_treasury_forecast: {
        Args: { months: number }
        Returns: Array<{ month: string; expected_income: number; projected_balance: number }>
      }
      search_all: {
        Args: { query: string }
        Returns: Array<{ type: string; id: string; title: string; snippet: string; url: string }>
      }
    }
  }
}
