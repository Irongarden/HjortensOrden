'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Shield, ScrollText, Users, Activity, Clock, RefreshCw,
  CheckCircle, XCircle, Link2, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Pencil, X, Upload, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthReady } from '@/lib/hooks/use-auth-ready'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { PageLoader } from '@/components/ui/skeleton'
import { formatRelative, compressImage } from '@/lib/utils'
import type { AuditEntry, Profile, PublicInviteLink, MemberRole, MemberStatus } from '@/lib/types'
import toast from 'react-hot-toast'

const supabase = createClient()

function useAuditLog() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['audit_log'],
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:profiles!actor_id(id, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as AuditEntry[]
    },
    staleTime: 30_000,
  })
}

function useAllMembers() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['members', 'all'],
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
    staleTime: 60_000,
  })
}

function useInviteLinks() {
  const authReady = useAuthReady()
  return useQuery<PublicInviteLink[]>({
    queryKey: ['invite_links'],
    enabled: authReady,
    queryFn: async () => {
      const res = await fetch('/api/invite-links')
      if (!res.ok) throw new Error('Fejl ved hentning af links')
      return res.json()
    },
    staleTime: 30_000,
  })
}

const ACTION_LABELS: Record<string, string> = {
  role_changed:     'Rolle ændret',
  member_invited:   'Medlem inviteret',
  member_suspended: 'Medlem suspenderet',
  poll_closed:      'Afstemning lukket',
  event_created:    'Begivenhed oprettet',
  event_deleted:    'Begivenhed slettet',
  payment_updated:  'Betaling opdateret',
  settings_changed: 'Indstillinger ændret',
}

const STAT_COLORS = [
  'from-gold/20 to-gold/5 border-gold/20',
  'from-forest/20 to-forest/5 border-forest/30',
  'from-blue-900/30 to-blue-900/5 border-blue-700/20',
  'from-purple-900/30 to-purple-900/5 border-purple-700/20',
]

// ─── Edit Member Modal ────────────────────────────────────────────────────────
function EditMemberModal({ member, onClose }: { member: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: member.full_name,
    email: member.email,
    phone: member.phone ?? '',
    bio: member.bio ?? '',
    city: member.city ?? '',
    role: member.role as MemberRole,
    status: member.status as MemberStatus,
    joined_at: member.joined_at ? member.joined_at.slice(0, 10) : '',
    is_founder: member.is_founder ?? false,
  })
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(file, { maxPx: 800, quality: 0.85 })
      const ext = 'jpg'
      const path = `${member.id}/profile.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: { publicUrl } } = (supabase as any).storage.from('avatars').getPublicUrl(path)
      const cacheBusted = `${publicUrl}?t=${Date.now()}`
      setAvatarUrl(cacheBusted)
      await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })
      toast.success('Profilbillede opdateret')
    } catch (e) {
      toast.error((e as Error).message || 'Kunne ikke uploade billede')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email !== member.email ? form.email : undefined,
          full_name: form.full_name,
          phone: form.phone || null,
          bio: form.bio || null,
          city: form.city || null,
          role: form.role,
          status: form.status,
          is_founder: form.is_founder,
          joined_at: form.joined_at ? new Date(form.joined_at).toISOString() : member.joined_at,
        }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl') }
      await qc.invalidateQueries({ queryKey: ['members', 'all'] })
      toast.success('Bruger opdateret')
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const ROLES: MemberRole[] = ['member', 'librarian', 'treasurer', 'vice_chairman', 'chairman', 'admin']
  const STATUSES: MemberStatus[] = ['active', 'pending', 'suspended', 'deactivated']
  const ROLE_LABELS: Record<MemberRole, string> = {
    admin: 'Administrator', chairman: 'Formand', vice_chairman: 'Næstformand',
    treasurer: 'Kasserer', librarian: 'Bibliotekar', member: 'Menigt Medlem',
  }
  const STATUS_LABELS: Record<MemberStatus, string> = {
    active: 'Aktiv', pending: 'Afventer', suspended: 'Suspenderet', deactivated: 'Deaktiveret',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-charcoal border border-border rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Clickable avatar upload */}
            <label className="relative cursor-pointer group" title="Skift profilbillede">
              <Avatar src={avatarUrl} name={member.full_name} size="md" ring />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading
                  ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  : <Upload size={13} className="text-white" />}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
              />
            </label>
            <div>
              <h2 className="font-serif text-heading-sm text-parchment">{member.full_name}</h2>
              <p className="text-xs text-muted">{member.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-parchment">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Fulde navn" value={form.full_name} onChange={set('full_name')} />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="E-mailadresse"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="medlem@example.com"
            />
            {form.email !== member.email && (
              <p className="text-[10px] text-gold/70 mt-1">⚠️ Ændrer login-e-mail for dette medlem</p>
            )}
          </div>
          <Input label="Telefon" value={form.phone} onChange={set('phone')} placeholder="+45 00 00 00 00" />
          <Input label="By" value={form.city} onChange={set('city')} placeholder="København…" />

          <div>
            <label className="block text-label-sm text-muted mb-1.5">Rolle</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="input-base w-full"
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-sm text-muted mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={set('status')}
              className="input-base w-full"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-label-sm text-muted mb-1.5">Indmeldt (dato)</label>
            <input
              type="date"
              value={form.joined_at}
              onChange={set('joined_at')}
              className="input-base w-full"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-gold rounded"
                checked={form.is_founder}
                onChange={(e) => {
                  const checked = e.target.checked
                  setForm((prev) => ({
                    ...prev,
                    is_founder: checked,
                    ...(checked ? { joined_at: '2017-02-04' } : {}),
                  }))
                }}
              />
              <span className="text-sm text-parchment/80">Stiftende medlem (founder)</span>
            </label>
            {form.is_founder && (
              <p className="text-[10px] text-gold/60 mt-1 ml-7">Indmeldelsesdato sat til 04/02/2017</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-label-sm text-muted mb-1.5">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={set('bio')}
              placeholder="Lidt om medlemmet…"
              className="input-base w-full resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Annuller</Button>
          <Button variant="gold" className="flex-1" loading={loading} onClick={handleSave}>Gem ændringer</Button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Create Invite Link Modal ────────────────────────────────────────────────
function CreateLinkModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/invite-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label || null,
          expires_at: expiresAt || null,
          max_uses: maxUses ? parseInt(maxUses) : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        toast.error(j.error ?? 'Fejl')
        return
      }
      await qc.invalidateQueries({ queryKey: ['invite_links'] })
      toast.success('Invitationslink oprettet')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-charcoal border border-border rounded-2xl p-6 w-full max-w-md space-y-4"
      >
        <h2 className="font-serif text-heading-lg text-parchment">Nyt invitationslink</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Label (valgfrit)"
            placeholder="F.eks. Forårsoptag 2025"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium uppercase tracking-wide">
              Udløbsdato (valgfrit)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/50"
            />
          </div>
          <Input
            label="Maks. antal anvendelser (valgfrit)"
            type="number"
            placeholder="F.eks. 10"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            min={1}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit" variant="gold" className="flex-1" loading={loading}>
              Opret link
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Admin Content ────────────────────────────────────────────────────────────
export function AdminContent() {
  const { can, isLoading: authLoading } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'links' | 'audit'>('overview')
  const [showCreateLink, setShowCreateLink] = useState(false)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Profile | null>(null)
  const [rejectConfirmMember, setRejectConfirmMember] = useState<Profile | null>(null)

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl ved sletning') }
    },
    onSuccess: (_data, memberId) => {
      qc.invalidateQueries({ queryKey: ['members', 'all'] })
      const name = deleteConfirmMember?.full_name ?? 'Medlemmet'
      toast.success(`${name} er blevet slettet`)
      setDeleteConfirmMember(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const { data: auditLog = [], isLoading: auditLoading, refetch: refetchAudit } = useAuditLog()
  const { data: members = [], isLoading: membersLoading } = useAllMembers()
  const { data: inviteLinks = [], isLoading: linksLoading, refetch: refetchLinks } = useInviteLinks()

  const pendingMembers = members.filter((m) => m.status === 'pending')

  // Approve pending member
  const approveMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl ved godkendelse') }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', 'all'] }); toast.success('Medlem godkendt — velkomst-email sendt') },
    onError: (e: Error) => toast.error(e.message),
  })

  // Reject pending member (deletes + sends rejection email)
  const rejectMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/admin/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl ved afvisning') }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', 'all'] })
      toast.success('Ansøgning afvist — besked sendt til ansøger')
      setRejectConfirmMember(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Toggle invite link active
  const toggleLinkMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/invite-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Fejl')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite_links'] }),
    onError: () => toast.error('Fejl ved opdatering'),
  })

  // Delete invite link
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invite-links/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fejl')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invite_links'] }); toast.success('Link slettet') },
    onError: () => toast.error('Fejl ved sletning'),
  })

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/join?token=${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link kopieret!')
  }

  if (authLoading) return <PageLoader />

  if (!can('manage_settings')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Shield size={48} className="text-muted opacity-40" />
        <h2 className="font-serif text-heading-lg text-parchment">Adgang nægtet</h2>
        <p className="text-muted text-sm max-w-xs">Kun administratorer har adgang til denne side.</p>
      </div>
    )
  }

  const totalActive    = members.filter((m) => m.status === 'active').length
  const totalSuspended = members.filter((m) => m.status === 'suspended').length
  const totalPending   = members.filter((m) => m.status === 'pending').length
  const totalMembers   = members.length

  const stats = [
    { label: 'Totalt medlemmer', value: totalMembers,   icon: Users },
    { label: 'Aktive',           value: totalActive,    icon: Activity },
    { label: 'Afventer',         value: totalPending,   icon: Clock },
    { label: 'Suspenderede',     value: totalSuspended, icon: Shield },
  ]

  const tabs = [
    { key: 'overview', label: 'Medlemsoversigt' },
    { key: 'pending',  label: `Ansøgninger${totalPending > 0 ? ` (${totalPending})` : ''}` },
    { key: 'links',    label: 'Invitationslinks' },
    { key: 'audit',    label: 'Revisionslog' },
  ] as const

  return (
    <>
      {showCreateLink && <CreateLinkModal onClose={() => setShowCreateLink(false)} />}
      {editingMember && <EditMemberModal member={editingMember} onClose={() => setEditingMember(null)} />}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-charcoal border border-red-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm text-parchment">Slet medlem</h3>
                <p className="text-sm text-muted mt-0.5">Denne handling kan ikke fortrydes.</p>
              </div>
            </div>
            <p className="text-sm text-parchment/80">
              Er du sikker på, at du vil slette <span className="font-semibold text-parchment">{deleteConfirmMember.full_name}</span>?
              Al data tilknyttet dette medlem vil blive permanent fjernet.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteConfirmMember(null)} disabled={deleteMemberMutation.isPending}>Annuller</Button>
              <Button
                variant="ghost"
                className="bg-red-700 hover:bg-red-600 text-white"
                loading={deleteMemberMutation.isPending}
                onClick={() => deleteMemberMutation.mutate(deleteConfirmMember.id)}
              >
                Ja, slet permanent
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectConfirmMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-charcoal border border-amber-700/40 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <XCircle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm text-parchment">Afvis ansøgning</h3>
                <p className="text-sm text-muted mt-0.5">Ansøgeren vil modtage en afvisnings-email.</p>
              </div>
            </div>
            <p className="text-sm text-parchment/80">
              Er du sikker på, at du vil afvise <span className="font-semibold text-parchment">{rejectConfirmMember.full_name}</span>s ansøgning?
              Deres konto vil blive slettet.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRejectConfirmMember(null)} disabled={rejectMutation.isPending}>Annuller</Button>
              <Button
                variant="ghost"
                className="bg-amber-700 hover:bg-amber-600 text-white"
                loading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectConfirmMember.id)}
              >
                Ja, afvis ansøgning
              </Button>
            </div>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">System</p>
          <h1 className="font-serif text-display-sm text-parchment">Admin</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`rounded-xl border bg-gradient-to-br p-5 ${STAT_COLORS[i]}`}>
              <s.icon size={20} className="text-muted mb-3" />
              <p className="text-3xl font-bold font-mono text-parchment">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-gold text-gold'
                  : 'border-transparent text-muted hover:text-parchment'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Medlemsoversigt ── */}
        {activeTab === 'overview' && (
          membersLoading ? <PageLoader /> : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-left px-4 py-3 text-muted font-medium">Navn</th>
                    <th className="text-left px-4 py-3 text-muted font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Rolle</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted font-medium hidden lg:table-cell">Indmeldt</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-border/50 hover:bg-surface/30 transition-colors ${i % 2 === 0 ? '' : 'bg-surface/10'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                          <span className="text-parchment font-medium">{m.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{m.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-full capitalize">
                          {m.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                          m.status === 'active'
                            ? 'bg-forest/10 text-green-400 border-green-700/30'
                            : m.status === 'pending'
                            ? 'bg-amber-900/20 text-amber-400 border-amber-700/30'
                            : 'bg-red-900/20 text-red-400 border-red-700/30'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs font-mono">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString('da-DK') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="p-1.5 rounded-lg text-muted hover:text-parchment hover:bg-surface transition-colors"
                            title="Rediger bruger"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmMember(m)}
                            className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
                            title="Slet bruger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Ansøgninger ── */}
        {activeTab === 'pending' && (
          membersLoading ? <PageLoader /> : pendingMembers.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p>Ingen afventende ansøgninger.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-left px-4 py-3 text-muted font-medium">Navn</th>
                    <th className="text-left px-4 py-3 text-muted font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-muted font-medium hidden lg:table-cell">Ansøgt</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-border/50 hover:bg-surface/30 transition-colors ${i % 2 === 0 ? '' : 'bg-surface/10'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                          <span className="text-parchment font-medium">{m.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{m.email}</td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs font-mono">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString('da-DK') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-red-700/30"
                            onClick={() => setRejectConfirmMember(m)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                          >
                            <XCircle size={14} />
                            Afvis
                          </Button>
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => approveMutation.mutate(m.id)}
                            loading={approveMutation.isPending}
                            disabled={rejectMutation.isPending}
                          >
                            <CheckCircle size={14} />
                            Godkend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Invitationslinks ── */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted">Del et link, så folk kan ansøge om medlemskab.</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => refetchLinks()}>
                  <RefreshCw size={14} /> Opdater
                </Button>
                <Button variant="gold" size="sm" onClick={() => setShowCreateLink(true)}>
                  <Plus size={14} /> Nyt link
                </Button>
              </div>
            </div>

            {linksLoading ? <PageLoader /> : inviteLinks.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <Link2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>Ingen invitationslinks oprettet endnu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inviteLinks.map((link) => {
                  const expired = link.expires_at ? new Date(link.expires_at) < new Date() : false
                  const exhausted = link.max_uses !== null && link.uses_count >= (link.max_uses ?? 0)
                  const url = `${window.location.origin}/join?token=${link.token}`
                  return (
                    <div
                      key={link.id}
                      className={`bg-charcoal border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                        link.active && !expired && !exhausted ? 'border-border' : 'border-border/40 opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-parchment font-medium text-sm">
                            {link.label ?? 'Navnløst link'}
                          </span>
                          {expired && (
                            <span className="text-xs px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-700/30 rounded-full">Udløbet</span>
                          )}
                          {exhausted && !expired && (
                            <span className="text-xs px-2 py-0.5 bg-orange-900/20 text-orange-400 border border-orange-700/30 rounded-full">Opbrugt</span>
                          )}
                          {!link.active && !expired && (
                            <span className="text-xs px-2 py-0.5 bg-surface text-muted border border-border rounded-full">Inaktiv</span>
                          )}
                        </div>
                        <p className="text-xs text-muted font-mono truncate">{url}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted">
                          {link.expires_at && (
                            <span>Udløber: {new Date(link.expires_at).toLocaleDateString('da-DK')}</span>
                          )}
                          <span>Anvendt: {link.uses_count}{link.max_uses !== null ? `/${link.max_uses}` : ''}×</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyLink(link.token)}
                          className="p-2 rounded-lg text-muted hover:text-parchment hover:bg-surface transition-colors"
                          title="Kopiér link"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => toggleLinkMutation.mutate({ id: link.id, active: !link.active })}
                          className="p-2 rounded-lg text-muted hover:text-parchment hover:bg-surface transition-colors"
                          title={link.active ? 'Deaktiver' : 'Aktiver'}
                        >
                          {link.active
                            ? <ToggleRight size={15} className="text-green-400" />
                            : <ToggleLeft size={15} />}
                        </button>
                        <button
                          onClick={() => { if (confirm('Slet dette invitationslink?')) deleteLinkMutation.mutate(link.id) }}
                          className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
                          title="Slet"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Revisionslog ── */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => refetchAudit()}>
                <RefreshCw size={14} /> Opdater
              </Button>
            </div>

            {auditLoading ? <PageLoader /> : auditLog.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
                <p>Ingen handlinger logget endnu.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => {
                  const actor = entry.actor as { id: string; full_name: string; avatar_url?: string | null } | null
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 bg-charcoal border border-border rounded-xl px-4 py-3 hover:border-gold/20 transition-colors"
                    >
                      {actor && (
                        <Avatar src={actor.avatar_url} name={actor.full_name} size="sm" className="mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-parchment font-medium text-sm">
                            {actor?.full_name ?? 'System'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-muted">
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                          {entry.entity_type && (
                            <span className="text-xs text-muted/60">{entry.entity_type}</span>
                          )}
                        </div>
                        {entry.metadata && (
                          <p className="text-xs text-muted mt-0.5 truncate">
                            {JSON.stringify(entry.metadata)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted font-mono whitespace-nowrap flex-shrink-0">
                        {formatRelative(entry.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  )
}
