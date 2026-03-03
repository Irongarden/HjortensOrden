'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, RefreshCw, DollarSign, X, Plus, ChevronDown,
  Globe, Lock, Users, ArrowRight,
  CheckCircle2, Clock, Trash2, Map, NotebookPen,
  Calendar, MapPin, ExternalLink, Pencil, Hammer,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDKK } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useMembers } from '@/lib/hooks/use-members'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/types/supabase'
import type { ArrangementProposal, ProposalStatus } from '@/lib/types'
import { WorkshopEditor, LIFECYCLE_STAGES } from './workshop-editor'

const WorkshopMapDynamic = dynamic(
  () => import('./workshop-map').then((m) => m.WorkshopMap),
  { ssr: false, loading: () => <div className="h-[260px] rounded-xl bg-surface border border-border animate-pulse" /> },
)

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface AISuggestion {
  title: string
  description: string
  type: string
  season: string
  estimatedBudget: number
}

interface EventOption { id: string; title: string; starts_at: string }

// ──────────────────────────────────────────────────────────────────────────────
// Supabase helper
// ──────────────────────────────────────────────────────────────────────────────
function supa() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
}

// ──────────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────────
function useProposals() {
  return useQuery({
    queryKey: ['arrangement_proposals'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('arrangement_proposals')
        .select('*, creator:profiles!created_by(id, full_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ArrangementProposal[]
    },
    staleTime: 30_000,
  })
}

function useCreateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Partial<ArrangementProposal> & { title: string }) => {
      const { data: { user } } = await supa().auth.getUser()
      if (!user) throw new Error('Ikke logget ind')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('arrangement_proposals')
        .insert({ ...p, created_by: user.id, publish_status: 'draft' })
        .select()
        .single()
      if (error) throw error
      return data as ArrangementProposal
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arrangement_proposals'] }) },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useUpdateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ArrangementProposal> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any)
        .from('arrangement_proposals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arrangement_proposals'] }); toast.success('Forslag gemt') },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useDeleteProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('arrangement_proposals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arrangement_proposals'] }); toast.success('Forslag slettet') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const SEASON_ICONS: Record<string, string> = { Forår: '🌸', Sommer: '☀️', Efterår: '🍂', Vinter: '❄️' }
const SUGGESTED_KEYWORDS = ['Natur', 'Luksus', 'Tradition', 'Kultur', 'Jagt', 'Whisky', 'Fest', 'Litteratur', 'Friluftsliv', 'Ceremoni']

const STATUS_CONFIG: Record<ProposalStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  draft: { label: 'Kladde',            icon: <Lock size={11} />,          color: 'text-muted',     bg: 'bg-surface border-border' },
  soft:  { label: 'Offentliggjort',    icon: <Globe size={11} />,         color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30' },
  full:  { label: 'Fuldt publiceret',  icon: <CheckCircle2 size={11} />,  color: 'text-green-400', bg: 'bg-forest/15 border-forest/40' },
}

const STATUS_NEXT: Record<ProposalStatus, { to: ProposalStatus; label: string } | null> = {
  draft: { to: 'soft', label: 'Offentliggør (basis info)' },
  soft:  { to: 'full', label: 'Fuldt publicer (alle detaljer)' },
  full:  null,
}

// ──────────────────────────────────────────────────────────────────────────────
// ProposalCard
// ──────────────────────────────────────────────────────────────────────────────
function ProposalCard({
  proposal, currentUserId, onEdit,
}: {
  proposal: ArrangementProposal
  currentUserId: string
  onEdit: (p: ArrangementProposal) => void
}) {
  const update = useUpdateProposal()
  const del = useDeleteProposal()
  const cfg = STATUS_CONFIG[proposal.publish_status]
  const next = STATUS_NEXT[proposal.publish_status]
  const isOwner = proposal.created_by === currentUserId
  const creator = proposal.creator as { full_name: string; avatar_url?: string | null } | undefined
  const canSeeDetails = isOwner || proposal.collaborator_ids.includes(currentUserId) || proposal.publish_status === 'full'
  const lifecycleCfg = LIFECYCLE_STAGES.find((s) => s.key === (proposal.lifecycle_stage ?? 'idea'))

  const dateLabel = proposal.proposed_date_from
    ? `${new Date(proposal.proposed_date_from).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}${proposal.proposed_date_to ? ` – ${new Date(proposal.proposed_date_to).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
    : proposal.proposed_date

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl transition-all ${
        proposal.publish_status === 'full'
          ? 'bg-gradient-to-br from-charcoal to-obsidian border-gold/25 hover:border-gold/40 p-0 overflow-hidden'
          : 'bg-charcoal border-border hover:border-gold/20 p-5'
      }`}
    >
      {proposal.publish_status === 'full' ? (
        // ── Rich info panel for fully published proposals ──
        <div>
          <div className="px-5 pt-5 pb-4 border-b border-gold/15">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                {lifecycleCfg && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${lifecycleCfg.bgActive} ${lifecycleCfg.color}`}>
                    {lifecycleCfg.icon} {lifecycleCfg.label}
                  </span>
                )}
                {proposal.season && <span className="text-xs text-muted">{SEASON_ICONS[proposal.season] ?? '✦'} {proposal.season}</span>}
                {proposal.type && <span className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-muted">{proposal.type}</span>}
              </div>
            </div>
            <h3 className="font-serif text-heading-sm text-parchment">{proposal.title}</h3>
            {proposal.description && <p className="text-xs text-parchment/60 mt-1 leading-relaxed">{proposal.description}</p>}
          </div>
          <div className="px-5 py-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            {proposal.estimated_budget && (
              <span className="flex items-center gap-1.5 text-muted"><DollarSign size={11} className="text-gold/60" /><span className="text-gold font-mono">{formatDKK(proposal.estimated_budget)}</span></span>
            )}
            {dateLabel && (
              <span className="flex items-center gap-1.5 text-muted"><Calendar size={11} className="text-gold/60" />{dateLabel}</span>
            )}
            {proposal.location && (
              <span className="flex items-center gap-1.5 text-muted col-span-2"><MapPin size={11} className="text-gold/60" />{proposal.location}</span>
            )}
          </div>
          <div className="px-5 pb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {creator && (
                <div className="flex items-center gap-1.5">
                  <Avatar src={creator.avatar_url} name={creator.full_name} size="xs" />
                  <span className="text-xs text-muted">{creator.full_name}</span>
                </div>
              )}
              {proposal.collaborator_ids.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted"><Users size={11} /> +{proposal.collaborator_ids.length}</span>
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(proposal)} className="text-[10px] px-2.5 py-1 bg-gold/10 text-gold border border-gold/25 rounded-full hover:bg-gold/20 transition-colors flex items-center gap-1">
                  <Pencil size={10} /> Åbn værksted
                </button>
                <button onClick={() => { if (confirm('Slet dette forslag?')) del.mutate(proposal.id) }} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── Compact card for draft/soft ──
        <>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                {lifecycleCfg && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${lifecycleCfg.bgActive} ${lifecycleCfg.color}`}>
                    {lifecycleCfg.icon} {lifecycleCfg.label}
                  </span>
                )}
                {proposal.season && <span className="text-xs text-muted">{SEASON_ICONS[proposal.season] ?? '✦'} {proposal.season}</span>}
                {proposal.type && <span className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-muted">{proposal.type}</span>}
              </div>
              <h3 className="font-serif text-heading-xs text-parchment">{proposal.title}</h3>
              {canSeeDetails && proposal.description && (
                <p className="text-xs text-parchment/60 mt-1 line-clamp-2">{proposal.description}</p>
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onEdit(proposal)} className="p-1.5 rounded-lg text-muted hover:text-parchment hover:bg-surface transition-colors" title="Åbn værksted">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { if (confirm('Slet dette forslag?')) del.mutate(proposal.id) }} className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors" title="Slet">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {canSeeDetails && (
            <div className="flex items-center gap-3 text-xs text-muted mb-3">
              {proposal.estimated_budget && (
                <span className="flex items-center gap-1"><DollarSign size={11} className="text-gold/60" />{formatDKK(proposal.estimated_budget)}</span>
              )}
              {dateLabel && (
                <span className="flex items-center gap-1"><Clock size={11} />{dateLabel}</span>
              )}
              {proposal.location && <span>📍 {proposal.location}</span>}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {creator && (
                <div className="flex items-center gap-1.5">
                  <Avatar src={creator.avatar_url} name={creator.full_name} size="xs" />
                  <span className="text-xs text-muted">{creator.full_name}</span>
                </div>
              )}
              {proposal.collaborator_ids.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Users size={11} /> +{proposal.collaborator_ids.length}
                </span>
              )}
            </div>
            {isOwner && next && (
              <button
                onClick={() => update.mutate({ id: proposal.id, publish_status: next.to })}
                disabled={update.isPending}
                className="text-[10px] px-2.5 py-1 bg-gold/10 text-gold border border-gold/25 rounded-full hover:bg-gold/20 transition-colors flex items-center gap-1"
              >
                <ArrowRight size={10} /> {next.label}
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// WorkshopEditor is imported from ./workshop-editor
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
type Tab = 'inspiration' | 'workshop'

export function InspirationContent() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('inspiration')

  // AI inspiration state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [preferredDate, setPreferredDate] = useState('')
  const [location, setLocation] = useState('')

  // Workshop state
  const [editingProposal, setEditingProposal] = useState<ArrangementProposal | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')

  // Load session notes from localStorage
  useEffect(() => {
    setSessionNotes(localStorage.getItem('hjortens-session-notes') ?? '')
  }, [])

  const { data: events = [] } = useQuery<EventOption[]>({
    queryKey: ['events', 'inspiration'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any).from('events').select('id, title, starts_at').order('starts_at', { ascending: false }).limit(30)
      if (error) throw error
      return data
    },
    staleTime: 120_000,
  })

  const { data: proposals = [], isLoading: proposalsLoading } = useProposals()
  const createProposal = useCreateProposal()
  const searchParams = useSearchParams()

  // Auto-open proposal from ?proposal=ID deep-link (e.g. from dashboard)
  useEffect(() => {
    const targetId = searchParams.get('proposal')
    if (!targetId || proposalsLoading || editingProposal) return
    const found = proposals.find((p) => p.id === targetId)
    if (found) {
      setActiveTab('workshop')
      setEditingProposal(found)
    }
  }, [searchParams, proposals, proposalsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, selectedEventIds, preferredDate, location }),
      })
      if (!res.ok) throw new Error('Fejl ved generering')
      return res.json() as Promise<AISuggestion[]>
    },
    onSuccess: (data) => setSuggestions(data),
    onError: () => toast.error('Kunne ikke generere forslag. Prøv igen.'),
  })

  const addKeyword = (kw: string) => {
    const t = kw.trim()
    if (t && !keywords.includes(t)) setKeywords((p) => [...p, t])
    setKeywordInput('')
  }

  const handleDevelopSuggestion = async (s: AISuggestion) => {
    try {
      const p = await createProposal.mutateAsync({
        title: s.title,
        description: s.description,
        type: s.type,
        season: s.season,
        estimated_budget: s.estimatedBudget,
        ai_seed: s.title,
      })
      toast.success('Tilføjet til Arrangement Værkstedet!')
      setActiveTab('workshop')
      setEditingProposal(p)
    } catch {
      // Error already shown via onError toast in the mutation
    }
  }

  const tabs = [
    { key: 'inspiration' as Tab, label: '✦ AI Inspiration' },
    { key: 'workshop' as Tab, label: `🔨 Arrangement Værksted${proposals.length > 0 ? ` (${proposals.length})` : ''}` },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      {!editingProposal && (
        <div className="flex items-end justify-between page-header-row">
          <div>
            <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
            <h1 className="font-serif text-display-sm text-parchment">Inspirations­motor</h1>
          </div>
          {activeTab === 'inspiration' && (
            <Button variant="gold" size="sm" onClick={() => generate.mutate()} loading={generate.isPending}>
              {suggestions.length > 0 ? <RefreshCw size={15} /> : <Sparkles size={15} />}
              {suggestions.length > 0 ? 'Nye forslag' : 'Generer forslag'}
            </Button>
          )}
          {activeTab === 'workshop' && (
            <Button variant="outline" size="sm" onClick={() => createProposal.mutateAsync({ title: 'Nyt arrangement' }).then((p) => setEditingProposal(p))} loading={createProposal.isPending}>
              <Plus size={15} /> Nyt forslag
            </Button>
          )}
        </div>
      )}

      {/* Tabs — hidden when in editor */}
      {!editingProposal && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-parchment'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Workshop editor (full page, replaces tab content) ── */}
      {editingProposal && (
        <WorkshopEditor proposal={editingProposal} onClose={() => setEditingProposal(null)} />
      )}

      {/* ── AI Inspiration Tab ── */}
      {!editingProposal && activeTab === 'inspiration' && (
        <div className="space-y-8">
          {/* Context panel */}
          <div className="rounded-2xl border border-border bg-charcoal p-5 space-y-5">
            <h2 className="text-sm font-medium text-parchment/80">Tilpas kontekst <span className="text-muted font-normal">(valgfri)</span></h2>

            {/* Keywords */}
            <div>
              <label className="block text-label-sm text-muted mb-2">Nøgleord / temaer</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {keywords.map((kw) => (
                  <span key={kw} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gold/10 border border-gold/30 text-gold rounded-full">
                    {kw}
                    <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(keywordInput) } }}
                  placeholder="Skriv et tema og tryk Enter…"
                  className="input-base flex-1 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addKeyword(keywordInput)} disabled={!keywordInput.trim()}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTED_KEYWORDS.filter((kw) => !keywords.includes(kw)).map((kw) => (
                  <button key={kw} type="button" onClick={() => addKeyword(kw)}
                    className="text-[11px] px-2 py-0.5 bg-surface border border-border text-muted rounded-full hover:border-gold/30 hover:text-parchment/70 transition-colors">
                    + {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Ønsket dato / periode</label>
                <input type="month" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="input-base w-full text-sm" />
              </div>
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Lokation / område</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-base w-full text-sm" placeholder="Fx Nordsjælland…" />
              </div>
            </div>

            {/* Event context */}
            <div>
              <label className="block text-label-sm text-muted mb-2">Basér på tidligere arrangementer</label>
              <button type="button" onClick={() => setShowEventPicker((v) => !v)}
                className="flex items-center justify-between w-full input-base text-sm text-left">
                <span className={selectedEventIds.length > 0 ? 'text-parchment' : 'text-muted'}>
                  {selectedEventIds.length > 0 ? `${selectedEventIds.length} arrangement${selectedEventIds.length > 1 ? 'er' : ''} valgt` : 'Vælg arrangementer (alle bruges som standard)'}
                </span>
                <ChevronDown size={15} className={`text-muted transition-transform ${showEventPicker ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showEventPicker && events.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
                      {events.map((ev) => (
                        <label key={ev.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface/50 transition-colors">
                          <input type="checkbox" className="w-3.5 h-3.5 accent-gold" checked={selectedEventIds.includes(ev.id)} onChange={() => setSelectedEventIds((p) => p.includes(ev.id) ? p.filter((e) => e !== ev.id) : [...p, ev.id])} />
                          <span className="text-sm text-parchment/80 flex-1 truncate">{ev.title}</span>
                          <span className="text-xs text-muted font-mono">{new Date(ev.starts_at).toLocaleDateString('da-DK', { year: 'numeric', month: 'short' })}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Intro / loading / cards */}
          {suggestions.length === 0 && !generate.isPending && (
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-charcoal via-charcoal to-obsidian p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
                <Sparkles size={28} className="text-gold" />
              </div>
              <h2 className="font-serif text-heading-lg text-parchment mb-3">Lad AI inspirere broderskabet</h2>
              <p className="text-muted text-sm max-w-lg mx-auto leading-relaxed">
                Tilpas nøgleord og vælg tidligere arrangementer som kontekst — eller klik bare på "Generer forslag" for 5 skræddersyede begivenhedsidéer. Klik derefter "Udvikl dette" for at arbejde videre i Arrangement Værkstedet.
              </p>
            </div>
          )}

          {generate.isPending && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl bg-charcoal border border-border p-6 animate-pulse space-y-3">
                  <div className="h-5 bg-surface rounded w-2/3" />
                  <div className="h-3 bg-surface rounded" />
                  <div className="h-3 bg-surface rounded w-4/5" />
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                    className="group bg-charcoal border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-gold/30 hover:shadow-card transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{SEASON_ICONS[s.season] ?? '✦'} {s.season}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-muted">{s.type}</span>
                    </div>
                    <h3 className="font-serif text-heading-sm text-parchment group-hover:text-gold transition-colors leading-snug">{s.title}</h3>
                    <p className="text-sm text-parchment/70 leading-relaxed flex-1">{s.description}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-sm text-muted flex-1">
                        <DollarSign size={13} className="text-gold/60" />
                        <span className="text-gold font-medium font-mono text-xs">{formatDKK(s.estimatedBudget)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={createProposal.isPending}
                        onClick={() => handleDevelopSuggestion(s)}
                        className="text-xs px-3 py-1.5 h-auto"
                      >
                        <Hammer size={12} /> Udvikl dette
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Workshop Tab ── */}
      {!editingProposal && activeTab === 'workshop' && (
        <div className="space-y-6">
          {/* Member locations map */}
          <div className="bg-charcoal border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Map size={15} className="text-gold/60" />
              <h3 className="font-serif text-heading-xs text-parchment">Medlemmernes Lokationer</h3>
            </div>
            <WorkshopMapDynamic />
          </div>

          {/* Session notes */}
          <div className="bg-charcoal border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <NotebookPen size={15} className="text-gold/60" />
              <h3 className="font-serif text-heading-xs text-parchment">Session Noter</h3>
              <span className="text-[10px] text-muted ml-auto">Gemmes lokalt i browseren</span>
            </div>
            <textarea
              value={sessionNotes}
              onChange={(e) => {
                setSessionNotes(e.target.value)
                localStorage.setItem('hjortens-session-notes', e.target.value)
              }}
              placeholder="Skriv noter til mødet, diskussion eller ideer her..."
              rows={5}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-parchment/90 placeholder:text-muted resize-none focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Status explanation */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {(Object.entries(STATUS_CONFIG) as [ProposalStatus, typeof STATUS_CONFIG[ProposalStatus]][]).map(([key, cfg]) => (
              <div key={key} className={`rounded-xl border p-3 ${cfg.bg}`}>
                <div className={`flex items-center justify-center gap-1.5 mb-1 ${cfg.color}`}>{cfg.icon}<span className="text-xs font-semibold">{cfg.label}</span></div>
                <p className="text-[10px] text-muted leading-relaxed">
                  {key === 'draft' ? 'Kun din gruppe kan se' : key === 'soft' ? 'Titel og dato synlig for alle' : 'Alle detaljer synlige'}
                </p>
              </div>
            ))}
          </div>

          {proposalsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl bg-charcoal border border-border p-5 animate-pulse h-32" />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <Hammer size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-serif text-parchment/50 text-heading-sm">Værkstedet er tomt</p>
              <p className="text-sm mt-2">Generer AI forslag og klik "Udvikl dette", eller opret et nyt forslag.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {proposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  currentUserId={profile?.id ?? ''}
                  onEdit={setEditingProposal}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
