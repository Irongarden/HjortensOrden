import { MemberRole } from '@/lib/types'

// Role hierarchy (higher index = more authority)
export const ROLE_HIERARCHY: MemberRole[] = [
  'member',
  'librarian',
  'treasurer',
  'vice_chairman',
  'chairman',
  'admin',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrator',
  chairman: 'Formand',
  vice_chairman: 'Næstformand',
  treasurer: 'Kasserer',
  librarian: 'Bibliotekar',
  member: 'Medlem',
}

export const ROLE_COLORS: Record<MemberRole, string> = {
  admin:         'text-red-400 bg-red-900/20 border-red-800/30',
  chairman:      'text-gold bg-gold/10 border-gold/20',
  vice_chairman: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
  treasurer:     'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
  librarian:     'text-blue-400 bg-blue-900/20 border-blue-800/30',
  member:        'text-muted bg-surface border-border',
}

// Check if role A has authority >= role B
export function hasMinRole(userRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole)
}

export function getRoleRank(role: MemberRole): number {
  return ROLE_HIERARCHY.indexOf(role)
}

// Permissions matrix
export const PERMISSIONS = {
  // Member management
  invite_members:    (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  change_roles:      (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  suspend_members:   (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  view_all_members:  (_role: MemberRole) => true,

  // Events
  create_events:     (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  edit_events:       (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  delete_events:     (role: MemberRole) => hasMinRole(role, 'chairman'),
  view_events:       (_role: MemberRole) => true,
  rsvp_events:       (_role: MemberRole) => true,

  // Treasury
  view_treasury:     (role: MemberRole) => hasMinRole(role, 'treasurer'),
  register_payments: (role: MemberRole) => hasMinRole(role, 'treasurer'),
  add_expenses:      (role: MemberRole) => hasMinRole(role, 'treasurer'),
  export_financials: (role: MemberRole) => hasMinRole(role, 'treasurer'),

  // Polls
  create_polls:      (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  vote_polls:        (_role: MemberRole) => true,
  close_polls:       (role: MemberRole) => hasMinRole(role, 'vice_chairman'),

  // Gallery
  upload_images:     (_role: MemberRole) => true,
  upload_gallery:    (_role: MemberRole) => true,                           // alias for upload_images
  delete_any_image:  (role: MemberRole) => hasMinRole(role, 'librarian'),
  manage_albums:     (role: MemberRole) => hasMinRole(role, 'librarian'),

  // Timeline
  create_timeline:   (role: MemberRole) => hasMinRole(role, 'librarian'),
  edit_timeline:     (role: MemberRole) => hasMinRole(role, 'librarian'),
  delete_timeline:   (role: MemberRole) => hasMinRole(role, 'chairman'),
  manage_timeline:   (role: MemberRole) => hasMinRole(role, 'librarian'),   // alias for edit_timeline

  // Polls (extra alias)
  manage_polls:      (role: MemberRole) => hasMinRole(role, 'vice_chairman'), // alias for close_polls

  // Members (extra alias)
  manage_members:    (role: MemberRole) => hasMinRole(role, 'vice_chairman'), // alias for change_roles

  // Admin
  view_audit_log:    (role: MemberRole) => hasMinRole(role, 'vice_chairman'),
  manage_settings:   (role: MemberRole) => role === 'admin',
} as const

export type Permission = keyof typeof PERMISSIONS

export function can(role: MemberRole, permission: Permission): boolean {
  return PERMISSIONS[permission](role)
}
