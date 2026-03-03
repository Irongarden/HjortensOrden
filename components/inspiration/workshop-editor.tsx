'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, Archive,
  Lightbulb, Hammer, BarChart2, Play,
  Users, DollarSign, CalendarDays, MapPin, ListTodo,
  Clapperboard, Sparkles, Plus, Trash2, X, GripVertical,
  Check, AlertCircle, ChevronDown, ChevronUp, Star,
  Pencil, RefreshCw, BookOpen, RotateCcw, Save,
  Globe, Lock, ExternalLink, Download,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDKK } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useMembers } from '@/lib/hooks/use-members'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/types/supabase'
import type {
  ArrangementProposal, LifecycleStage, ProposalStatus,
  BudgetPlannedLine, BudgetActualLine, BudgetCategory,
  ProposalTask, TaskPriority,
  ProgramSlot, ProposalEvaluation,
  ProposalRSVP, ProposalAuditEntry, ProposalAISuggestion,
} from '@/lib/types'
import { BUDGET_CATEGORIES } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Supabase helper
// ─────────────────────────────────────────────────────────────────────────────
function supa() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle config
// ─────────────────────────────────────────────────────────────────────────────
export const LIFECYCLE_STAGES: Array<{
  key: LifecycleStage
  label: string
  shortLabel: string
  icon: React.ReactNode
  description: string
  requiredFields: string[]
  color: string
  bgActive: string
}> = [
  {
    key: 'idea', label: 'Idé', shortLabel: 'Idé',
    icon: <Lightbulb size={13} />,
    description: 'Første gnist — noter idéen og beskriv konceptet.',
    requiredFields: ['title'],
    color: 'text-purple-400', bgActive: 'bg-purple-900/20 border-purple-700/30',
  },
  {
    key: 'planning', label: 'Planlægning', shortLabel: 'Plan',
    icon: <Hammer size={13} />,
    description: 'Ansvarlig valgt, budget og detaljer under udarbejdelse.',
    requiredFields: ['title', 'responsible_member_id', 'estimated_budget'],
    color: 'text-amber-400', bgActive: 'bg-amber-900/20 border-amber-700/30',
  },
  {
    key: 'confirmed', label: 'Bekræftet', shortLabel: 'Bekræft',
    icon: <CheckCircle2 size={13} />,
    description: 'Dato og lokation er fastsat — klar til publicering.',
    requiredFields: ['proposed_date_from', 'location'],
    color: 'text-blue-400', bgActive: 'bg-blue-900/20 border-blue-700/30',
  },
  {
    key: 'archived', label: 'Arkiveret', shortLabel: 'Arkiv',
    icon: <Archive size={13} />,
    description: 'Arrangementet er afsluttet og arkiveret.',
    requiredFields: [],
    color: 'text-muted', bgActive: 'bg-surface border-border',
  },
]

const STAGE_IDX: Record<LifecycleStage, number> = {
  idea: 0, planning: 1, confirmed: 2, archived: 3,
}

// ─────────────────────────────────────────────────────────────────────────────
// Local hooks
// ─────────────────────────────────────────────────────────────────────────────
function useBudgetPlanned(proposalId: string) {
  return useQuery({
    queryKey: ['budget_planned', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_budget_planned').select('*').eq('proposal_id', proposalId).order('sort_order')
      if (error) throw error
      return (data ?? []) as BudgetPlannedLine[]
    },
  })
}

function useBudgetActual(proposalId: string) {
  return useQuery({
    queryKey: ['budget_actual', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_budget_actual').select('*').eq('proposal_id', proposalId).order('sort_order')
      if (error) throw error
      return (data ?? []) as BudgetActualLine[]
    },
  })
}

function useTasks(proposalId: string) {
  return useQuery({
    queryKey: ['tasks', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_tasks')
        .select('*, assignee:profiles!assigned_to(id, full_name, avatar_url)')
        .eq('proposal_id', proposalId)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as ProposalTask[]
    },
  })
}

function useProgramSlots(proposalId: string) {
  return useQuery({
    queryKey: ['program_slots', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_program_slots')
        .select('*, responsible:profiles!responsible_id(id, full_name, avatar_url)')
        .eq('proposal_id', proposalId)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as ProgramSlot[]
    },
  })
}

function useRSVP(proposalId: string) {
  return useQuery({
    queryKey: ['rsvp', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_rsvp')
        .select('*, member:profiles!user_id(id, full_name, avatar_url)')
        .eq('proposal_id', proposalId)
      if (error) throw error
      return (data ?? []) as ProposalRSVP[]
    },
  })
}

function useEvaluation(proposalId: string) {
  return useQuery({
    queryKey: ['evaluation', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('proposal_evaluations').select('*').eq('proposal_id', proposalId).maybeSingle()
      return data as ProposalEvaluation | null
    },
  })
}

function useAuditLog(proposalId: string) {
  return useQuery({
    queryKey: ['audit_log', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supa() as any)
        .from('proposal_audit_log')
        .select('*, actor:profiles!actor_id(id, full_name, avatar_url)')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as ProposalAuditEntry[]
    },
  })
}

function useAISuggestions(proposalId: string) {
  return useQuery({
    queryKey: ['ai_suggestions', proposalId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('proposal_ai_suggestions')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(10)
      return (data ?? []) as ProposalAISuggestion[]
    },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arrangement_proposals'] }) },
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

function useLogAudit() {
  return useMutation({
    mutationFn: async (entry: Omit<ProposalAuditEntry, 'id' | 'created_at' | 'actor'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supa() as any).from('proposal_audit_log').insert(entry)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  title:                   'Titel',
  description:             'Beskrivelse',
  responsible_member_id:   'Ansvarlig person',
  budget_responsible_id:   'Budgetansvarlig',
  estimated_budget:        'Estimeret budget',
  proposed_date_from:      'Startdato',
  proposed_date_to:        'Slutdato',
  location:                'Lokation',
  expected_participants:   'Forventet deltagerantal',
  max_participants:        'Maks. deltagere',
  price_per_participant:   'Pris pr. deltager',
  has_tasks:               'Mindst én opgave',
  idea_notes:              'Idénoter',
  notes:                   'Interne noter',
}

function validateStage(
  stage: LifecycleStage,
  proposal: ArrangementProposal,
  taskCount: number,
): string[] {
  const cfg = LIFECYCLE_STAGES.find((s) => s.key === stage)
  if (!cfg) return []
  const missing: string[] = []
  for (const field of cfg.requiredFields) {
    if (field === 'has_tasks') {
      if (taskCount === 0) missing.push(FIELD_LABELS['has_tasks'])
      continue // always skip the generic field check — has_tasks is not a DB column
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (proposal as any)[field]
    if (!val && val !== 0) missing.push(FIELD_LABELS[field] ?? field)
  }
  return missing
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── PublishStatusBar ─────────────────────────────────
const PUBLISH_CONFIG: Record<ProposalStatus, {
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bg: string
}> = {
  draft: {
    label: 'Intern kladde',
    description: 'Kun synlig for dig og dine samarbejdspartnere.',
    icon: <Lock size={13} />,
    color: 'text-muted',
    bg: 'bg-surface border-border',
  },
  soft: {
    label: 'Bekendtgjort',
    description: 'Alle medlemmer kan se arrangementet og tilmelde interesse.',
    icon: <Globe size={13} />,
    color: 'text-amber-400',
    bg: 'bg-amber-900/20 border-amber-700/30',
  },
  full: {
    label: 'Fuldt publiceret',
    description: 'Alle detaljer, billeder og program er synlige for alle medlemmer.',
    icon: <CheckCircle2 size={13} />,
    color: 'text-green-400',
    bg: 'bg-forest/15 border-forest/40',
  },
}

const PUBLISH_NEXT: Record<ProposalStatus, { to: ProposalStatus; label: string; hint: string } | null> = {
  draft: { to: 'soft',  label: 'Bekendtgør for alle',   hint: 'Medlemmer kan se arrangementet og tilmelde interesse' },
  soft:  { to: 'full',  label: 'Fuldt publicér',         hint: 'Alle detaljer, billeder og program offentliggøres' },
  full:  null,
}

function PublishStatusBar({
  status, onPublish, isOwner,
}: {
  status: ProposalStatus
  onPublish: (to: ProposalStatus) => void
  isOwner: boolean
}) {
  const cfg = PUBLISH_CONFIG[status]
  const next = PUBLISH_NEXT[status]
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${cfg.bg}`}>
      <div className={`flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
        <p className="text-[11px] text-muted mt-0.5">{cfg.description}</p>
      </div>
      {isOwner && next && (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <button
            onClick={() => onPublish(next.to)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-gold/10 text-gold border border-gold/30 rounded-full hover:bg-gold/20 transition-all"
          >
            <Globe size={10} /> {next.label}
          </button>
          <p className="text-[10px] text-muted/60 max-w-[200px] text-right leading-tight">{next.hint}</p>
        </div>
      )}
    </div>
  )
}

// ── LifecycleStepper ──────────────────────────────────
function LifecycleStepper({
  current, onAdvance, proposal, taskCount, tasksLoading, isOwner,
}: {
  current: LifecycleStage
  onAdvance: (to: LifecycleStage) => void
  proposal: ArrangementProposal
  taskCount: number
  tasksLoading: boolean
  isOwner: boolean
}) {
  const currentIdx = STAGE_IDX[current]
  const nextStage = LIFECYCLE_STAGES[currentIdx + 1]
  // While the task query is still loading, treat task count as satisfied to avoid false warnings
  const effectiveTaskCount = tasksLoading ? 1 : taskCount
  const missing = nextStage ? validateStage(nextStage.key, proposal, effectiveTaskCount) : []

  return (
    <div className="space-y-3">
      {/* Stepper track */}
      <div className="flex items-center gap-0">
        {LIFECYCLE_STAGES.map((stage, i) => {
          const isDone = i < currentIdx
          const isActive = i === currentIdx
          const isFuture = i > currentIdx
          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className={`flex flex-col items-center gap-1 min-w-0 ${isFuture ? 'opacity-40' : ''}`}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone  ? 'bg-green-500/20 border-green-500 text-green-400' :
                  isActive ? `${stage.bgActive} border-current ${stage.color}` :
                  'bg-surface border-border text-muted'
                }`}>
                  {isDone ? <Check size={12} /> : stage.icon}
                </div>
                <span className={`text-[9px] font-medium hidden sm:block truncate max-w-[56px] text-center ${isActive ? stage.color : 'text-muted'}`}>
                  {stage.shortLabel}
                </span>
              </div>
              {i < LIFECYCLE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-green-500/40' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Current stage info + advance button */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${LIFECYCLE_STAGES[currentIdx].bgActive}`}>
        <div className={`flex-1 min-w-0 ${LIFECYCLE_STAGES[currentIdx].color}`}>
          <p className="text-xs font-semibold">{LIFECYCLE_STAGES[currentIdx].label}</p>
          <p className="text-[11px] text-muted mt-0.5">{LIFECYCLE_STAGES[currentIdx].description}</p>
        </div>
        {isOwner && nextStage && (
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {missing.length > 0 && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertCircle size={10} /> Mangler: {missing.slice(0, 2).join(', ')}
              </p>
            )}
            <button
              onClick={() => missing.length === 0 && onAdvance(nextStage.key)}
              disabled={missing.length > 0}
              className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                missing.length === 0
                  ? 'bg-gold/10 text-gold border-gold/30 hover:bg-gold/20 cursor-pointer'
                  : 'text-muted/40 border-border/30 cursor-not-allowed'
              }`}
            >
              <ArrowRight size={10} /> Flyt til {nextStage.label}
            </button>
          </div>
        )}
        {isOwner && current !== 'idea' && (
          <button
            onClick={() => onAdvance(LIFECYCLE_STAGES[currentIdx - 1]?.key ?? 'idea')}
            className="p-1.5 text-muted hover:text-parchment/60 rounded-lg transition-colors flex-shrink-0"
            title="Gå et trin tilbage"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── EstimateRow helper ────────────────────────────────
function EstimateRow({ label, amount, onSet }: { label: string; amount: number; onSet?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex-1 text-muted">{label}</span>
      <span className="font-mono text-parchment/80">{formatDKK(amount)}</span>
      {onSet && (
        <button
          onClick={onSet}
          className="text-[10px] text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 rounded px-1.5 py-0.5 transition-all"
        >
          Sæt
        </button>
      )}
    </div>
  )
}

// ── BudgetModule ──────────────────────────────────────
function BudgetModule({ proposalId, proposal, isOwner }: { proposalId: string; proposal: ArrangementProposal; isOwner: boolean }) {
  const qc = useQueryClient()
  const { data: planned = [] } = useBudgetPlanned(proposalId)
  const { data: actual = [] } = useBudgetActual(proposalId)
  const { data: members = [] } = useMembers()
  const { data: rsvps = [] } = useRSVP(proposalId)
  const update = useUpdateProposal()
  const [view, setView] = useState<'planned' | 'actual'>('planned')
  const [adding, setAdding] = useState(false)
  const [newLine, setNewLine] = useState({ line_type: 'expense' as 'income' | 'expense', category: '' as BudgetCategory | '', label: '', amount: '' })
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(proposal.estimated_budget?.toString() ?? '')

  const activeMembers = members.filter((m) => m.status === 'active').length
  const budgetAttending = rsvps.filter((r) => r.status === 'attending').length

  const setEstimate = async (amount: number) => {
    await update.mutateAsync({ id: proposalId, estimated_budget: amount })
    toast.success('Budget opdateret')
  }

  const addPlanned = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_budget_planned').insert({
        proposal_id: proposalId,
        line_type: newLine.line_type,
        category: newLine.category || null,
        label: newLine.label,
        amount: parseFloat(newLine.amount) || 0,
        sort_order: planned.length,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget_planned', proposalId] })
      setNewLine({ line_type: 'expense', category: '', label: '', amount: '' })
      setAdding(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deletePlanned = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_budget_planned').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_planned', proposalId] }),
  })

  const addActual = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_budget_actual').insert({
        proposal_id: proposalId,
        category: newLine.category || null,
        label: newLine.label,
        amount: parseFloat(newLine.amount) || 0,
        sort_order: actual.length,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget_actual', proposalId] })
      setNewLine({ line_type: 'expense', category: '', label: '', amount: '' })
      setAdding(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteActual = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_budget_actual').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_actual', proposalId] }),
  })

  const plannedIncome = planned.filter((l) => l.line_type === 'income').reduce((s, l) => s + Number(l.amount), 0)
  const plannedExpenses = planned.filter((l) => l.line_type === 'expense').reduce((s, l) => s + Number(l.amount), 0)
  const plannedBalance = plannedIncome - plannedExpenses
  const actualTotal = actual.reduce((s, l) => s + Number(l.amount), 0)
  const variance = plannedExpenses - actualTotal
  const budgetHealth = Math.abs(plannedExpenses) > 0 ? Math.min(100, Math.round(100 * (1 - Math.abs(variance) / Math.abs(plannedExpenses)))) : 100

  const linesByCategory = (lines: typeof planned) => {
    const groups: Record<string, typeof planned> = {}
    for (const l of lines) {
      const k = l.category ?? 'Diverse'
      if (!groups[k]) groups[k] = []
      groups[k].push(l)
    }
    return groups
  }

  return (
    <div className="space-y-4">
      {/* ── Participant estimate panel ── */}
      {proposal.price_per_participant && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gold flex items-center gap-1.5">
              <DollarSign size={11} /> Deltager-estimat
            </h4>
            <span className="text-[10px] text-muted">{formatDKK(proposal.price_per_participant)}/pers.</span>
          </div>
          {activeMembers > 0 && (
            <EstimateRow
              label={`Alle aktive medlemmer (${activeMembers})`}
              amount={activeMembers * proposal.price_per_participant}
              onSet={isOwner ? () => setEstimate(activeMembers * proposal.price_per_participant!) : undefined}
            />
          )}
          {budgetAttending > 0 && (
            <EstimateRow
              label={`RSVP tilmeldte (${budgetAttending})`}
              amount={budgetAttending * proposal.price_per_participant}
              onSet={isOwner ? () => setEstimate(budgetAttending * proposal.price_per_participant!) : undefined}
            />
          )}
          {proposal.expected_participants != null && (
            <EstimateRow
              label={`Forventet antal (${proposal.expected_participants})`}
              amount={proposal.expected_participants * proposal.price_per_participant}
              onSet={isOwner ? () => setEstimate(proposal.expected_participants! * proposal.price_per_participant!) : undefined}
            />
          )}
          {/* Current estimated_budget display / edit */}
          <div className="flex items-center gap-2 pt-2 border-t border-gold/20">
            <span className="text-xs text-muted flex-1">Sat samlet budget:</span>
            {editingBudget ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="input-base w-28 text-xs py-1"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                />
                <Button size="sm" variant="gold" loading={update.isPending} onClick={() => { setEstimate(parseFloat(budgetInput) || 0); setEditingBudget(false) }}>Gem</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>✕</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-medium ${proposal.estimated_budget ? 'text-gold' : 'text-muted/50'}`}>
                  {proposal.estimated_budget ? formatDKK(proposal.estimated_budget) : 'Ikke sat'}
                </span>
                {isOwner && (
                  <button
                    onClick={() => { setBudgetInput(proposal.estimated_budget?.toString() ?? ''); setEditingBudget(true) }}
                    className="text-muted hover:text-parchment transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle planned / actual */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1 w-fit">
        {(['planned', 'actual'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${view === v ? 'bg-charcoal text-parchment' : 'text-muted hover:text-parchment'}`}>
            {v === 'planned' ? 'Planlagt' : 'Faktisk'}
          </button>
        ))}
      </div>

      {view === 'planned' && (
        <div className="space-y-5">
          {/* Income section */}
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ChevronUp size={11} className="text-green-400" /> Indtægter
            </h4>
            {planned.filter(l => l.line_type === 'income').length === 0
              ? <p className="text-xs text-muted/40 italic pl-2">Ingen indtægtslinjer</p>
              : planned.filter(l => l.line_type === 'income').map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 group">
                  <span className="flex-1 text-sm text-parchment/80">{l.label}</span>
                  <span className="text-sm font-mono text-green-400">+{formatDKK(Number(l.amount))}</span>
                  {isOwner && (
                    <button onClick={() => deletePlanned.mutate(l.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all"><X size={12} /></button>
                  )}
                </div>
              ))
            }
          </div>

          {/* Expense sections by category */}
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ChevronDown size={11} className="text-red-400" /> Udgifter
            </h4>
            {planned.filter(l => l.line_type === 'expense').length === 0
              ? <p className="text-xs text-muted/40 italic pl-2">Ingen udgiftslinjer</p>
              : Object.entries(linesByCategory(planned.filter(l => l.line_type === 'expense'))).map(([cat, lines]) => (
                <div key={cat} className="mb-3">
                  <p className="text-[10px] text-muted/60 uppercase tracking-wide mb-1 pl-0.5">{cat}</p>
                  {lines.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 group">
                      <span className="flex-1 text-sm text-parchment/80">{l.label}</span>
                      {l.notes && <span className="text-[10px] text-muted/50 truncate max-w-[120px]">{l.notes}</span>}
                      <span className="text-sm font-mono text-red-400">-{formatDKK(Number(l.amount))}</span>
                      {isOwner && (
                        <button onClick={() => deletePlanned.mutate(l.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all"><X size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            }
          </div>

          {/* Totals */}
          <div className="rounded-xl bg-surface border border-border px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted">
              <span>Samlede indtægter</span><span className="text-green-400 font-mono">+{formatDKK(plannedIncome)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Samlede udgifter</span><span className="text-red-400 font-mono">-{formatDKK(plannedExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-1.5 mt-1.5">
              <span className="text-parchment/80">Planlagt balance</span>
              <span className={`font-mono ${plannedBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {plannedBalance >= 0 ? '+' : ''}{formatDKK(plannedBalance)}
              </span>
            </div>
          </div>

          {/* Add line */}
          {isOwner && (
            <div>
              {!adding ? (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Tilføj linje</Button>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <select className="input-base text-xs py-1.5" value={newLine.line_type} onChange={(e) => setNewLine((p) => ({ ...p, line_type: e.target.value as 'income' | 'expense' }))}>
                      <option value="expense">Udgift</option>
                      <option value="income">Indtægt</option>
                    </select>
                    {newLine.line_type === 'expense' && (
                      <select className="input-base text-xs py-1.5 flex-1" value={newLine.category} onChange={(e) => setNewLine((p) => ({ ...p, category: e.target.value as BudgetCategory }))}>
                        <option value="">Kategori…</option>
                        {BUDGET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-base flex-1 text-sm py-1.5" value={newLine.label} onChange={(e) => setNewLine((p) => ({ ...p, label: e.target.value }))} placeholder="Beskrivelse…" />
                    <input type="number" className="input-base w-28 text-sm py-1.5" value={newLine.amount} onChange={(e) => setNewLine((p) => ({ ...p, amount: e.target.value }))} placeholder="DKK" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="gold" loading={addPlanned.isPending} onClick={() => addPlanned.mutate()} disabled={!newLine.label}>Tilføj</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuller</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'actual' && (
        <div className="space-y-4">
          <p className="text-xs text-muted">Faktiske udgifter efter arrangementet — sammenlign med planlagt.</p>

          {actual.length === 0
            ? <p className="text-sm text-muted/40 italic py-4 text-center">Ingen faktiske udgifter registreret endnu.</p>
            : actual.map((l) => {
              const match = planned.find((p) => p.id === l.planned_line_id)
              const diff = match ? Number(l.amount) - Number(match.amount) : null
              return (
                <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 group">
                  <span className="flex-1 text-sm text-parchment/80">{l.label}</span>
                  {diff !== null && (
                    <span className={`text-[10px] font-mono ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {diff > 0 ? '+' : ''}{formatDKK(diff)}
                    </span>
                  )}
                  <span className="text-sm font-mono text-parchment/70">{formatDKK(Number(l.amount))}</span>
                  {isOwner && (
                    <button onClick={() => deleteActual.mutate(l.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all"><X size={12} /></button>
                  )}
                </div>
              )
            })
          }

          {/* Budget health */}
          {actual.length > 0 && plannedExpenses > 0 && (
            <div className="rounded-xl bg-surface border border-border px-4 py-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Planlagt</span><span className="font-mono text-parchment/70">{formatDKK(plannedExpenses)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Faktisk</span><span className="font-mono text-parchment/70">{formatDKK(actualTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-1.5">
                <span className="text-parchment/80">Afvigelse</span>
                <span className={`font-mono ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{variance >= 0 ? '+' : ''}{formatDKK(variance)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted"><span>Budget sundhed</span><span>{budgetHealth}%</span></div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${budgetHealth >= 80 ? 'bg-green-500' : budgetHealth >= 50 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${budgetHealth}%` }} />
                </div>
              </div>
            </div>
          )}

          {isOwner && (
            <div>
              {!adding ? (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Tilføj faktisk udgift</Button>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                  <div className="flex gap-2">
                    <input className="input-base flex-1 text-sm py-1.5" value={newLine.label} onChange={(e) => setNewLine((p) => ({ ...p, label: e.target.value }))} placeholder="Beskrivelse…" />
                    <input type="number" className="input-base w-28 text-sm py-1.5" value={newLine.amount} onChange={(e) => setNewLine((p) => ({ ...p, amount: e.target.value }))} placeholder="DKK" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="gold" loading={addActual.isPending} onClick={() => addActual.mutate()} disabled={!newLine.label}>Tilføj</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuller</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TasksModule ───────────────────────────────────────
function TasksModule({ proposalId, isOwner }: { proposalId: string; isOwner: boolean }) {
  const qc = useQueryClient()
  const { data: tasks = [] } = useTasks(proposalId)
  const { data: members = [] } = useMembers()
  const { profile } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'open' | 'done' | 'mine'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority'>('created')
  const [adding, setAdding] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', due_date: '', priority: 'medium' as TaskPriority })

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supa().auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_tasks').insert({
        proposal_id: proposalId,
        title: newTask.title,
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null,
        priority: newTask.priority,
        created_by: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', proposalId] }); setNewTask({ title: '', assigned_to: '', due_date: '', priority: 'medium' }); setAdding(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'done' }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', proposalId] }),
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', proposalId] }),
  })

  const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
    low:    { label: 'Lav',  color: 'text-muted' },
    medium: { label: 'Mel', color: 'text-amber-400' },
    high:   { label: 'Høj', color: 'text-red-400' },
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'open')  return t.status === 'open'
    if (filter === 'done')  return t.status === 'done'
    if (filter === 'mine')  return t.assigned_to === profile?.id
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'due') return (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1
    if (sortBy === 'priority') {
      const p: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    }
    return 0
  })

  const open = tasks.filter((t) => t.status === 'open').length
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="space-y-4">
      {/* Stats + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="text-parchment font-medium">{open}</span> åbne
          <span className="text-green-400 font-medium ml-1">{done}</span> udført
        </div>
        <div className="flex gap-1 ml-auto flex-wrap">
          {(['all','open','done','mine'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${filter === f ? 'bg-gold/10 text-gold border-gold/30' : 'text-muted border-border hover:text-parchment'}`}>
              {f === 'all' ? 'Alle' : f === 'open' ? 'Åbne' : f === 'done' ? 'Udført' : 'Mine'}
            </button>
          ))}
          <select className="input-base text-[10px] py-0.5 ml-1" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="created">Oprettet</option>
            <option value="due">Frist</option>
            <option value="priority">Prioritet</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-muted border border-dashed border-border/50 rounded-xl">
          <ListTodo size={24} className="mx-auto mb-2 opacity-20" />
          <p className="text-xs">Ingen opgaver {filter !== 'all' ? 'i dette filter' : 'endnu'}.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((task) => {
            const assignee = task.assignee as { full_name: string; avatar_url?: string | null } | undefined
            const isOverdue = task.due_date && task.status === 'open' && new Date(task.due_date) < new Date()
            return (
              <div key={task.id} className={`group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all ${task.status === 'done' ? 'opacity-50 bg-surface/30 border-border/30' : 'bg-surface/50 border-border hover:border-gold/20'}`}>
                <button onClick={() => toggleTask.mutate({ id: task.id, status: task.status === 'done' ? 'open' : 'done' })}
                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-border hover:border-gold/50'}`}>
                  {task.status === 'done' && <Check size={10} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted/50' : 'text-parchment/90'}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[task.priority].color}`}>{PRIORITY_CONFIG[task.priority].label}</span>
                    {task.due_date && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'text-muted'}`}>
                        <Clock size={9} />
                        {new Date(task.due_date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                        {isOverdue && ' — overskredet'}
                      </span>
                    )}
                    {assignee && (
                      <span className="flex items-center gap-1 text-[10px] text-muted">
                        <Avatar src={assignee.avatar_url} name={assignee.full_name} size="xs" />
                        {assignee.full_name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <button onClick={() => deleteTask.mutate(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all flex-shrink-0"><Trash2 size={12} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add task */}
      {(isOwner || true) && (
        <div>
          {!adding ? (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Ny opgave</Button>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <input className="input-base w-full text-sm py-1.5" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} placeholder="Opgavebeskrivelse…" autoFocus />
              <div className="flex gap-2 flex-wrap">
                <select className="input-base text-xs py-1.5 flex-1" value={newTask.assigned_to} onChange={(e) => setNewTask((p) => ({ ...p, assigned_to: e.target.value }))}>
                  <option value="">Tildel til…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
                <input type="date" className="input-base text-xs py-1.5 [color-scheme:dark]" value={newTask.due_date} onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))} />
                <select className="input-base text-xs py-1.5" value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as TaskPriority }))}>
                  <option value="low">Lav</option>
                  <option value="medium">Medium</option>
                  <option value="high">Høj</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="gold" loading={addTask.isPending} onClick={() => addTask.mutate()} disabled={!newTask.title.trim()}>Tilføj</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuller</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ProgramModule ─────────────────────────────────────
function ProgramModule({ proposalId, isOwner }: { proposalId: string; isOwner: boolean }) {
  const qc = useQueryClient()
  const { data: slots = [] } = useProgramSlots(proposalId)
  const { data: members = [] } = useMembers()
  const [adding, setAdding] = useState(false)
  const [printMode, setPrintMode] = useState(false)
  const [newSlot, setNewSlot] = useState({ slot_time: '', title: '', description: '', responsible_id: '' })
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const addSlot = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_program_slots').insert({
        proposal_id: proposalId,
        slot_time: newSlot.slot_time,
        title: newSlot.title,
        description: newSlot.description || null,
        responsible_id: newSlot.responsible_id || null,
        sort_order: slots.length,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['program_slots', proposalId] }); setNewSlot({ slot_time: '', title: '', description: '', responsible_id: '' }); setAdding(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_program_slots').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program_slots', proposalId] }),
  })

  const reorder = useCallback(async (from: number, to: number) => {
    if (from === to) return
    const reordered = [...slots]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    // Update sort_order
    await Promise.all(reordered.map((s, i) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supa() as any).from('proposal_program_slots').update({ sort_order: i }).eq('id', s.id)
    ))
    qc.invalidateQueries({ queryKey: ['program_slots', proposalId] })
  }, [slots, proposalId, qc])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{slots.length} programpunkter</p>
        <button onClick={() => setPrintMode((v) => !v)} className="text-[10px] text-muted hover:text-parchment flex items-center gap-1 transition-colors">
          <BookOpen size={11} /> {printMode ? 'Rediger' : 'Vis program'}
        </button>
      </div>

      {printMode ? (
        // ── Print/preview timeline ──
        <div className="rounded-xl border border-border bg-surface/30 p-6 space-y-0">
          {slots.length === 0
            ? <p className="text-muted text-sm text-center py-6">Ingen programpunkter endnu.</p>
            : slots.map((slot, i) => {
              const resp = slot.responsible as { full_name: string; avatar_url?: string | null } | undefined
              return (
                <div key={slot.id} className="flex gap-4 pb-6 last:pb-0 relative">
                  {/* Timeline line */}
                  {i < slots.length - 1 && <div className="absolute left-[26px] top-7 bottom-0 w-0.5 bg-border/50" />}
                  <div className="w-13 flex-shrink-0 text-right">
                    <span className="text-xs font-mono text-gold">{slot.slot_time}</span>
                  </div>
                  <div className="w-3 h-3 mt-1 rounded-full bg-gold/30 border-2 border-gold/60 flex-shrink-0" />
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-semibold text-parchment">{slot.title}</p>
                    {slot.description && <p className="text-xs text-muted mt-0.5">{slot.description}</p>}
                    {resp && (
                      <span className="flex items-center gap-1 text-[10px] text-muted mt-1">
                        <Avatar src={resp.avatar_url} name={resp.full_name} size="xs" /> {resp.full_name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        // ── Edit list ──
        <div className="space-y-1.5">
          {slots.length === 0 && (
            <div className="text-center py-8 text-muted border border-dashed border-border/50 rounded-xl">
              <Clapperboard size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs">Ingen programpunkter endnu.</p>
            </div>
          )}
          {slots.map((slot, i) => {
            const resp = slot.responsible as { full_name: string } | undefined
            return (
              <div
                key={slot.id}
                draggable={isOwner}
                onDragStart={() => { dragItem.current = i }}
                onDragEnter={() => { dragOver.current = i }}
                onDragEnd={() => {
                  if (dragItem.current !== null && dragOver.current !== null) {
                    reorder(dragItem.current, dragOver.current)
                  }
                  dragItem.current = null
                  dragOver.current = null
                }}
                onDragOver={(e) => e.preventDefault()}
                className="group flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2.5 hover:border-gold/20 transition-all cursor-default"
              >
                {isOwner && <GripVertical size={13} className="text-muted/30 group-hover:text-muted cursor-grab flex-shrink-0" />}
                <span className="text-xs font-mono text-gold w-12 flex-shrink-0">{slot.slot_time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-parchment/90 truncate">{slot.title}</p>
                  {(slot.description || resp) && (
                    <p className="text-[10px] text-muted truncate">{slot.description}{slot.description && resp ? ' · ' : ''}{resp?.full_name}</p>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => deleteSlot.mutate(slot.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all flex-shrink-0"><X size={12} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add slot */}
      {isOwner && !printMode && (
        <div>
          {!adding ? (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Tilføj programpunkt</Button>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="flex gap-2">
                <input type="time" className="input-base text-sm py-1.5 w-28 [color-scheme:dark]" value={newSlot.slot_time} onChange={(e) => setNewSlot((p) => ({ ...p, slot_time: e.target.value }))} />
                <input className="input-base flex-1 text-sm py-1.5" value={newSlot.title} onChange={(e) => setNewSlot((p) => ({ ...p, title: e.target.value }))} placeholder="Titel…" />
              </div>
              <input className="input-base w-full text-sm py-1.5" value={newSlot.description} onChange={(e) => setNewSlot((p) => ({ ...p, description: e.target.value }))} placeholder="Beskrivelse (valgfri)…" />
              <select className="input-base w-full text-xs py-1.5" value={newSlot.responsible_id} onChange={(e) => setNewSlot((p) => ({ ...p, responsible_id: e.target.value }))}>
                <option value="">Ansvarlig…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant="gold" loading={addSlot.isPending} onClick={() => addSlot.mutate()} disabled={!newSlot.title || !newSlot.slot_time}>Tilføj</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuller</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ParticipantsModule ────────────────────────────────
function ParticipantsModule({
  proposal,
  isOwner,
  eventAttendees = [],
  myEventRsvp = null,
  onEventRsvp,
}: {
  proposal: ArrangementProposal
  isOwner: boolean
  eventAttendees?: Array<{ rsvp: string; profile: { id: string; full_name: string; avatar_url?: string | null } }>
  myEventRsvp?: { rsvp: string } | null
  onEventRsvp?: (status: 'attending' | 'maybe' | 'not_attending') => void
}) {
  const qc = useQueryClient()
  const update = useUpdateProposal()
  const { data: rsvps = [] } = useRSVP(proposal.id)
  const { profile } = useAuthStore()
  const { data: members = [] } = useMembers()
  const [editingCounts, setEditingCounts] = useState(false)
  const [counts, setCounts] = useState({ expected: proposal.expected_participants?.toString() ?? '', max: proposal.max_participants?.toString() ?? '', price: proposal.price_per_participant?.toString() ?? '' })

  const upsertRSVP = useMutation({
    mutationFn: async (status: 'attending' | 'maybe' | 'declined') => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any).from('proposal_rsvp').upsert({
        proposal_id: proposal.id, user_id: profile!.id, status, responded_at: new Date().toISOString(),
      }, { onConflict: 'proposal_id,user_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsvp', proposal.id] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const myRSVP = rsvps.find((r) => r.user_id === profile?.id)
  const hasLinkedEvent = !!proposal.linked_event_id
  const attending = hasLinkedEvent
    ? eventAttendees.filter((a) => a.rsvp === 'attending').length
    : rsvps.filter((r) => r.status === 'attending').length
  const maybe = hasLinkedEvent
    ? eventAttendees.filter((a) => a.rsvp === 'maybe').length
    : rsvps.filter((r) => r.status === 'maybe').length
  const declined = hasLinkedEvent
    ? eventAttendees.filter((a) => a.rsvp === 'not_attending').length
    : rsvps.filter((r) => r.status === 'declined').length
  const maxPart = proposal.max_participants

  const getIsActive = (key: 'attending' | 'maybe' | 'declined'): boolean => {
    if (hasLinkedEvent) {
      const eventKey = key === 'declined' ? 'not_attending' : key
      return myEventRsvp?.rsvp === eventKey
    }
    return myRSVP?.status === key
  }

  const handleRSVP = (key: 'attending' | 'maybe' | 'declined') => {
    if (hasLinkedEvent && onEventRsvp) {
      onEventRsvp(key === 'declined' ? 'not_attending' : key)
    } else {
      upsertRSVP.mutate(key)
    }
  }

  const RSVP_CFG: Array<{ key: 'attending' | 'maybe' | 'declined'; label: string; color: string; bg: string }> = [
    { key: 'attending', label: 'Deltager',  color: 'text-green-400',  bg: 'bg-forest/20 border-forest/40' },
    { key: 'maybe',     label: 'Måske',     color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/30' },
    { key: 'declined',  label: 'Afmelder',  color: 'text-red-400',    bg: 'bg-red-900/15 border-red-800/30' },
  ]

  return (
    <div className="space-y-5">
      {/* Capacity row */}
      <div className="flex items-center gap-4 flex-wrap">
        {editingCounts ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" className="input-base w-24 text-xs py-1.5" placeholder="Forventet" value={counts.expected} onChange={(e) => setCounts((p) => ({ ...p, expected: e.target.value }))} />
            <input type="number" className="input-base w-24 text-xs py-1.5" placeholder="Max" value={counts.max} onChange={(e) => setCounts((p) => ({ ...p, max: e.target.value }))} />
            <input type="number" className="input-base w-28 text-xs py-1.5" placeholder="Pris/person DKK" value={counts.price} onChange={(e) => setCounts((p) => ({ ...p, price: e.target.value }))} />
            <Button size="sm" variant="gold" onClick={() => {
              update.mutate({ id: proposal.id, expected_participants: counts.expected ? parseInt(counts.expected) : null, max_participants: counts.max ? parseInt(counts.max) : null, price_per_participant: counts.price ? parseFloat(counts.price) : null })
              setEditingCounts(false)
            }}>Gem</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingCounts(false)}>Annuller</Button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>Forventet: <span className="text-parchment font-medium">{proposal.expected_participants ?? '—'}</span></span>
            <span>Max: <span className="text-parchment font-medium">{maxPart ?? '—'}</span></span>
            {proposal.price_per_participant && (
              <span>Pris: <span className="text-gold font-medium">{formatDKK(proposal.price_per_participant)}/pers.</span></span>
            )}
            {isOwner && <button onClick={() => setEditingCounts(true)} className="text-muted hover:text-parchment"><Pencil size={11} /></button>}
          </div>
        )}
      </div>

      {/* RSVP stats */}
      <div className="grid grid-cols-3 gap-2">
        {RSVP_CFG.map((cfg) => {
          const count = cfg.key === 'attending' ? attending : cfg.key === 'maybe' ? maybe : declined
          return (
            <div key={cfg.key} className={`rounded-xl border text-center py-3 ${cfg.bg}`}>
              <p className={`text-xl font-serif font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[10px] text-muted mt-0.5">{cfg.label}</p>
            </div>
          )
        })}
      </div>

      {/* Waitlist warning */}
      {maxPart && attending > maxPart && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/10 border border-amber-700/20 rounded-lg px-3 py-2">
          <AlertCircle size={12} /> {attending - maxPart} over kapacitet — venteliste aktiveret
        </div>
      )}

      {/* My RSVP */}
      <div>
        <p className="text-label-sm text-muted mb-2">Din tilmelding</p>
        <div className="flex gap-2">
          {RSVP_CFG.map((cfg) => (
            <button key={cfg.key} onClick={() => handleRSVP(cfg.key)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${getIsActive(cfg.key) ? `${cfg.bg} ${cfg.color}` : 'border-border text-muted hover:text-parchment hover:border-gold/20'}`}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* RSVP list */}
      {hasLinkedEvent ? (
        eventAttendees.length > 0 ? (
          <div className="rounded-xl border border-border divide-y divide-border/40 overflow-hidden">
            {eventAttendees.map((a, i) => {
              const statusKey = a.rsvp === 'not_attending' ? 'declined' : (a.rsvp as 'attending' | 'maybe' | 'declined')
              const cfg = RSVP_CFG.find((c) => c.key === statusKey)
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar src={a.profile?.avatar_url} name={a.profile?.full_name ?? '?'} size="xs" />
                  <span className="flex-1 text-sm text-parchment/80">{a.profile?.full_name}</span>
                  {cfg && <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted/50 italic text-center py-2">Ingen tilmeldinger endnu</p>
        )
      ) : rsvps.length > 0 ? (
        <div className="rounded-xl border border-border divide-y divide-border/40 overflow-hidden">
          {rsvps.map((r) => {
            const member = r.member as { full_name: string; avatar_url?: string | null } | undefined
            const cfg = RSVP_CFG.find((c) => c.key === r.status)
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar src={member?.avatar_url} name={member?.full_name ?? '?'} size="xs" />
                <span className="flex-1 text-sm text-parchment/80">{member?.full_name}</span>
                {cfg && <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ── EvaluationModule ──────────────────────────────────
function EvaluationModule({ proposal, isOwner }: { proposal: ArrangementProposal; isOwner: boolean }) {
  const qc = useQueryClient()
  const { data: evaluation } = useEvaluation(proposal.id)
  const { data: rsvps = [] } = useRSVP(proposal.id)
  const { data: planned = [] } = useBudgetPlanned(proposal.id)
  const { data: actual  = [] } = useBudgetActual(proposal.id)
  const { profile } = useAuthStore()
  const [form, setForm] = useState({
    what_worked:    evaluation?.what_worked ?? '',
    what_to_improve: evaluation?.what_to_improve ?? '',
    rating:         evaluation?.rating?.toString() ?? '',
    repeat_as_tradition: evaluation?.repeat_as_tradition ?? false,
    actual_attendees: evaluation?.actual_attendees?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)

  const plannedExpenses = planned.filter(l => l.line_type === 'expense').reduce((s, l) => s + Number(l.amount), 0)
  const actualTotal = actual.reduce((s, l) => s + Number(l.amount), 0)
  const attendingRSVP = rsvps.filter((r) => r.status === 'attending').length

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        proposal_id: proposal.id,
        what_worked:       form.what_worked || null,
        what_to_improve:   form.what_to_improve || null,
        rating:            form.rating ? parseInt(form.rating) : null,
        repeat_as_tradition: form.repeat_as_tradition,
        actual_attendees:  form.actual_attendees ? parseInt(form.actual_attendees) : null,
        submitted_by:      profile!.id,
        updated_at:        new Date().toISOString(),
      }
      if (evaluation?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supa() as any).from('proposal_evaluations').update(payload).eq('id', evaluation.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supa() as any).from('proposal_evaluations').insert(payload)
      }
      qc.invalidateQueries({ queryKey: ['evaluation', proposal.id] })
      toast.success('Evaluering gemt')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          <p className="text-lg font-serif font-bold text-parchment">{attendingRSVP}</p>
          <p className="text-[10px] text-muted">Tilmeldte</p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          <p className="text-lg font-serif font-bold text-parchment">{form.actual_attendees || '—'}</p>
          <p className="text-[10px] text-muted">Faktiske deltagere</p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          {plannedExpenses > 0 ? (
            <>
              <p className={`text-lg font-serif font-bold ${actualTotal <= plannedExpenses ? 'text-green-400' : 'text-red-400'}`}>{formatDKK(Math.abs(plannedExpenses - actualTotal))}</p>
              <p className="text-[10px] text-muted">{actualTotal <= plannedExpenses ? 'Under budget' : 'Over budget'}</p>
            </>
          ) : <p className="text-muted text-xs pt-2">–</p>}
        </div>
      </div>

      <div>
        <label className="block text-label-sm text-muted mb-1.5">Hvad gik godt?</label>
        <textarea rows={3} className="input-base w-full resize-none" value={form.what_worked} onChange={(e) => setForm((p) => ({ ...p, what_worked: e.target.value }))} disabled={!isOwner} placeholder="Det fungerede rigtig godt da…" />
      </div>
      <div>
        <label className="block text-label-sm text-muted mb-1.5">Hvad kan forbedres?</label>
        <textarea rows={3} className="input-base w-full resize-none" value={form.what_to_improve} onChange={(e) => setForm((p) => ({ ...p, what_to_improve: e.target.value }))} disabled={!isOwner} placeholder="Næste gang bør vi…" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-label-sm text-muted mb-1.5">Samlet vurdering</label>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setForm((p) => ({ ...p, rating: String(n) }))} disabled={!isOwner}
                className={`w-9 h-9 rounded-lg border text-sm transition-all ${String(n) === form.rating ? 'bg-gold/15 border-gold text-gold' : 'border-border text-muted hover:border-gold/30'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-label-sm text-muted mb-1.5">Faktiske deltagere</label>
          <input type="number" className="input-base w-full py-1.5" value={form.actual_attendees} onChange={(e) => setForm((p) => ({ ...p, actual_attendees: e.target.value }))} disabled={!isOwner} placeholder="Antal" />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer group">
        <input type="checkbox" className="accent-gold w-4 h-4" checked={form.repeat_as_tradition} onChange={(e) => setForm((p) => ({ ...p, repeat_as_tradition: e.target.checked }))} disabled={!isOwner} />
        <div>
          <p className="text-sm text-parchment group-hover:text-gold transition-colors">Gør til tradition</p>
          <p className="text-[10px] text-muted">Markér dette arrangement til gentagelse hvert år</p>
        </div>
        {form.repeat_as_tradition && <Star size={14} className="text-gold ml-auto" />}
      </label>
      {isOwner && (
        <Button variant="gold" loading={saving} onClick={save}><Save size={13} /> Gem evaluering</Button>
      )}
    </div>
  )
}

// ── AI result renderer ────────────────────────────────
function renderAIResult(actionType: string, data: unknown) {
  if (!data) return null

  if (actionType === 'theme-ideas') {
    const items = data as Array<{ theme: string; concept: string; moodWords: string[]; suggestedActivities: string[] }>
    return (
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg bg-surface/50 border border-border/40 p-3 space-y-1.5">
            <p className="text-sm font-semibold text-parchment">{item.theme}</p>
            <p className="text-xs text-parchment/70 leading-relaxed">{item.concept}</p>
            {(item.moodWords?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {item.moodWords.map((w, j) => (
                  <span key={j} className="text-[10px] bg-gold/10 text-gold border border-gold/20 rounded-full px-2 py-0.5">{w}</span>
                ))}
              </div>
            )}
            {(item.suggestedActivities?.length ?? 0) > 0 && (
              <ul className="text-[11px] text-muted space-y-0.5 pt-1">
                {item.suggestedActivities.map((a, j) => (
                  <li key={j} className="flex items-start gap-1"><span className="text-gold/50 select-none">·</span>{a}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (actionType === 'program-timeline') {
    const items = data as Array<{ time: string; title: string; description: string; durationMinutes: number }>
    return (
      <div className="max-h-80 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 pb-3 last:pb-0">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
              {i < items.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1 min-h-[16px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-gold font-bold">{item.time}</span>
                  <span className="text-xs font-medium text-parchment">{item.title}</span>
                </div>
                {item.durationMinutes > 0 && (
                  <span className="text-[10px] text-muted whitespace-nowrap flex-shrink-0">{item.durationMinutes} min</span>
                )}
              </div>
              {item.description && (
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (actionType === 'budget-breakdown') {
    const bdata = data as {
      incomeLines?: Array<{ label: string; amount: number }>
      expenseLines?: Array<{ category: string; label: string; amount: number; notes: string }>
    }
    const totalIncome  = bdata.incomeLines?.reduce((s, l) => s + Number(l.amount), 0) ?? 0
    const totalExpense = bdata.expenseLines?.reduce((s, l) => s + Number(l.amount), 0) ?? 0
    const net = totalIncome - totalExpense
    return (
      <div className="max-h-80 overflow-y-auto pr-1 space-y-3 text-xs">
        {(bdata.incomeLines?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-forest uppercase tracking-wider mb-1.5">Indtægter</p>
            {bdata.incomeLines!.map((l, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
                <span className="text-parchment/80">{l.label}</span>
                <span className="font-mono text-forest">+{Number(l.amount).toLocaleString('da-DK')} kr</span>
              </div>
            ))}
          </div>
        )}
        {(bdata.expenseLines?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">Udgifter</p>
            {bdata.expenseLines!.map((l, i) => (
              <div key={i} className="py-1.5 border-b border-border/20 last:border-0">
                <div className="flex justify-between">
                  <span className="text-parchment/80">{l.label}</span>
                  <span className="font-mono text-red-400">−{Number(l.amount).toLocaleString('da-DK')} kr</span>
                </div>
                {l.notes && <p className="text-[10px] text-muted mt-0.5">{l.notes}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-border">
          <span className="font-semibold text-parchment">Netto</span>
          <span className={`font-mono font-semibold ${net >= 0 ? 'text-forest' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}{net.toLocaleString('da-DK')} kr
          </span>
        </div>
      </div>
    )
  }

  if (actionType === 'activities') {
    const ENV_LABELS: Record<string, string> = { indoor: 'Indendørs', outdoor: 'Udendørs', both: 'Begge' }
    const items = data as Array<{ title: string; description: string; duration: string; indoorOutdoor: string; estimatedCostPerPerson: number }>
    return (
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg bg-surface/50 border border-border/40 p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-parchment">{item.title}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.duration && <span className="text-[10px] text-muted">{item.duration}</span>}
                {item.indoorOutdoor && (
                  <span className="text-[10px] bg-surface border border-border/50 rounded px-1.5 py-0.5 text-muted">
                    {ENV_LABELS[item.indoorOutdoor] ?? item.indoorOutdoor}
                  </span>
                )}
              </div>
            </div>
            {item.description && <p className="text-[11px] text-parchment/70 leading-relaxed">{item.description}</p>}
            {Number(item.estimatedCostPerPerson) > 0 && (
              <p className="text-[10px] text-gold/70 mt-1.5">≈ {Number(item.estimatedCostPerPerson).toLocaleString('da-DK')} kr/person</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Fallback
  return (
    <pre className="text-[11px] text-parchment/80 whitespace-pre-wrap leading-relaxed overflow-auto max-h-80 font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// ── AI Result Editor sub-components ──────────────────

type ThemeItem    = { theme: string; concept: string; moodWords: string[]; suggestedActivities: string[] }
type TimelineItem = { time: string; title: string; description: string; durationMinutes: number }
type BudgetAIData = {
  incomeLines?: Array<{ label: string; amount: number }>
  expenseLines?: Array<{ category: string; label: string; amount: number; notes: string }>
}
type ActivityItem = { title: string; description: string; duration: string; indoorOutdoor: string; estimatedCostPerPerson: number }

function ThemeEditor({ initialItems, proposal, onApplied }: {
  initialItems: ThemeItem[]
  proposal: ArrangementProposal
  onApplied: () => void
}) {
  const [items, setItems] = useState(
    initialItems.map((it) => ({ ...it, moodWordsStr: (it.moodWords ?? []).join(', ') }))
  )
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const update = useUpdateProposal()

  const setField = (idx: number, field: string, val: string) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))

  const apply = async () => {
    if (selectedIdx === null) return
    const item = items[selectedIdx]
    const moodWords = item.moodWordsStr.split(',').map((w) => w.trim()).filter(Boolean)
    const ideaNotes = [
      `Tema: ${item.theme}`,
      moodWords.length ? `Stemningsord: ${moodWords.join(', ')}` : '',
      (item.suggestedActivities?.length)
        ? `Forslåede aktiviteter:\n${item.suggestedActivities.map((a) => `• ${a}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n')
    await update.mutateAsync({ id: proposal.id, description: item.concept, idea_notes: ideaNotes })
    toast.success('Tema skrevet til arrangementet')
    onApplied()
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted">Vælg og rediger et tema — klik <strong className="text-parchment/70">Brug</strong> for at skrive til arrangementet.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 cursor-pointer transition-all ${selectedIdx === i ? 'border-gold/50 bg-gold/5' : 'border-border bg-surface/30 hover:border-gold/20'}`}
            onClick={() => setSelectedIdx(i)}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${selectedIdx === i ? 'border-gold bg-gold/20' : 'border-muted/40'}`}>
                {selectedIdx === i && <div className="w-1.5 h-1.5 rounded-full bg-gold" />}
              </div>
              <input
                className="input-base text-xs py-0.5 flex-1 font-semibold"
                value={item.theme}
                onChange={(e) => { e.stopPropagation(); setField(i, 'theme', e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Tema navn"
              />
            </div>
            {selectedIdx === i ? (
              <div className="space-y-1.5 pl-5">
                <textarea
                  className="input-base text-xs w-full leading-relaxed resize-none"
                  rows={3}
                  value={item.concept}
                  onChange={(e) => setField(i, 'concept', e.target.value)}
                  placeholder="Koncept / beskrivelse"
                />
                <input
                  className="input-base text-xs py-1 w-full"
                  value={item.moodWordsStr}
                  onChange={(e) => setField(i, 'moodWordsStr', e.target.value)}
                  placeholder="Stemningsord, kommasepareret"
                />
              </div>
            ) : (
              item.concept && <p className="text-[11px] text-muted/70 pl-5 line-clamp-2">{item.concept}</p>
            )}
          </div>
        ))}
      </div>
      <button
        disabled={selectedIdx === null || update.isPending}
        onClick={apply}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold py-2.5 hover:bg-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {update.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
        Brug dette tema
      </button>
      <p className="text-[10px] text-muted/60 text-center">→ Skriver til: Beskrivelse + Idénoter</p>
    </div>
  )
}

function TimelineEditor({ initialItems, proposalId, onApplied }: {
  initialItems: TimelineItem[]
  proposalId: string
  onApplied: () => void
}) {
  const qc = useQueryClient()
  const [items, setItems] = useState(initialItems)
  const [applying, setApplying] = useState(false)

  const setField = (idx: number, field: keyof TimelineItem, val: string | number) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))

  const apply = async () => {
    setApplying(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supa() as any)
        .from('proposal_program_slots').select('sort_order').eq('proposal_id', proposalId)
        .order('sort_order', { ascending: false }).limit(1)
      const startOrder = (existing?.[0]?.sort_order ?? -1) + 1
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supa() as any).from('proposal_program_slots').insert({
          proposal_id: proposalId,
          slot_time: item.time,
          title: item.title,
          description: item.description || null,
          responsible_id: null,
          sort_order: startOrder + i,
        })
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['program_slots', proposalId] })
      toast.success(`${items.length} programpunkter tilføjet`)
      onApplied()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setApplying(false) }
  }

  return (
    <div className="space-y-3">
      <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                className="input-base text-xs py-1 w-16 font-mono text-center"
                value={item.time}
                onChange={(e) => setField(i, 'time', e.target.value)}
                placeholder="16:00"
              />
              <input
                className="input-base text-xs py-1 flex-1 font-medium"
                value={item.title}
                onChange={(e) => setField(i, 'title', e.target.value)}
                placeholder="Titel"
              />
              <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-red-400 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
            <textarea
              className="input-base text-xs w-full leading-relaxed resize-none"
              rows={2}
              value={item.description ?? ''}
              onChange={(e) => setField(i, 'description', e.target.value)}
              placeholder="Beskrivelse (valgfri)"
            />
          </div>
        ))}
      </div>
      <button
        disabled={items.length === 0 || applying}
        onClick={apply}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold py-2.5 hover:bg-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {applying ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
        Tilføj {items.length} punkter til program
      </button>
      <p className="text-[10px] text-muted/60 text-center">→ Tilføjer til: Program</p>
    </div>
  )
}

function BudgetEditorAI({ initialData, proposalId, proposal, onApplied }: {
  initialData: BudgetAIData
  proposalId: string
  proposal: ArrangementProposal
  onApplied: () => void
}) {
  const qc = useQueryClient()
  const update = useUpdateProposal()
  const [incomeLines, setIncomeLines] = useState(
    (initialData.incomeLines ?? []).map((l) => ({ ...l, amount: String(l.amount) }))
  )
  const [expenseLines, setExpenseLines] = useState(
    (initialData.expenseLines ?? []).map((l) => ({ ...l, amount: String(l.amount) }))
  )
  const [applying, setApplying] = useState(false)

  const totalExpense = expenseLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const totalIncome  = incomeLines.reduce((s, l)  => s + (parseFloat(l.amount) || 0), 0)

  const apply = async () => {
    setApplying(true)
    try {
      const allLines = [
        ...incomeLines.map((l, i) => ({ line_type: 'income' as const, category: null, label: l.label, amount: parseFloat(l.amount) || 0, sort_order: i })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...expenseLines.map((l, i) => ({ line_type: 'expense' as const, category: (l.category as any) || null, label: l.label, amount: parseFloat(l.amount) || 0, notes: l.notes || null, sort_order: incomeLines.length + i })),
      ]
      for (const line of allLines) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supa() as any).from('proposal_budget_planned').insert({ proposal_id: proposalId, ...line })
        if (error) throw error
      }
      if (totalExpense > 0) {
        await update.mutateAsync({ id: proposalId, estimated_budget: totalExpense })
      }
      qc.invalidateQueries({ queryKey: ['budget_planned', proposalId] })
      toast.success(`${allLines.length} budgetlinjer tilføjet`)
      onApplied()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setApplying(false) }
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {incomeLines.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-forest uppercase tracking-wider mb-1.5">Indtægter</p>
          {incomeLines.map((l, i) => (
            <div key={i} className="flex gap-2 mb-1.5 items-center">
              <input className="input-base text-xs py-1 flex-1" value={l.label} onChange={(e) => setIncomeLines((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Beskrivelse" />
              <input className="input-base text-xs py-1 w-24 font-mono text-right" type="number" value={l.amount} onChange={(e) => setIncomeLines((p) => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
              <button onClick={() => setIncomeLines((p) => p.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-red-400"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
      {expenseLines.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">Udgifter</p>
          {expenseLines.map((l, i) => (
            <div key={i} className="flex gap-2 mb-1.5 items-center flex-wrap">
              <select className="input-base text-xs py-1 w-36 flex-shrink-0" value={l.category} onChange={(e) => setExpenseLines((p) => p.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                <option value="">Kategori…</option>
                {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input-base text-xs py-1 flex-1 min-w-[80px]" value={l.label} onChange={(e) => setExpenseLines((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Beskrivelse" />
              <input className="input-base text-xs py-1 w-24 font-mono text-right" type="number" value={l.amount} onChange={(e) => setExpenseLines((p) => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
              <button onClick={() => setExpenseLines((p) => p.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-red-400"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between text-xs border-t border-border pt-2">
        <span className="text-muted">Netto</span>
        <span className={`font-mono font-semibold ${totalIncome - totalExpense >= 0 ? 'text-forest' : 'text-red-400'}`}>
          {totalIncome - totalExpense >= 0 ? '+' : ''}{(totalIncome - totalExpense).toLocaleString('da-DK')} kr
        </span>
      </div>
      <button
        disabled={applying || (incomeLines.length + expenseLines.length === 0)}
        onClick={apply}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold py-2.5 hover:bg-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {applying ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
        Tilføj {incomeLines.length + expenseLines.length} linjer til planlagt budget
      </button>
      {totalExpense > 0 && (
        <p className="text-[10px] text-muted/60 text-center">→ Tilføjer til: Planlagt budget · sætter estimeret budget til {totalExpense.toLocaleString('da-DK')} kr</p>
      )}
    </div>
  )
}

function ActivitiesEditorAI({ initialItems, proposalId, onApplied }: {
  initialItems: ActivityItem[]
  proposalId: string
  onApplied: () => void
}) {
  const qc = useQueryClient()
  const [items, setItems] = useState(initialItems)
  const [applying, setApplying] = useState(false)

  const apply = async () => {
    setApplying(true)
    try {
      const { data: { user } } = await supa().auth.getUser()
      for (const item of items) {
        const notes = [
          item.description,
          item.duration ? `Varighed: ${item.duration}` : '',
          item.indoorOutdoor ? `Miljø: ${{ indoor: 'Indendørs', outdoor: 'Udendørs', both: 'Begge' }[item.indoorOutdoor] ?? item.indoorOutdoor}` : '',
          Number(item.estimatedCostPerPerson) > 0 ? `Est. pris: ${Number(item.estimatedCostPerPerson).toLocaleString('da-DK')} kr/person` : '',
        ].filter(Boolean).join('\n')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supa() as any).from('proposal_tasks').insert({
          proposal_id: proposalId,
          title: item.title,
          notes: notes || null,
          assigned_to: null,
          due_date: null,
          priority: 'medium',
          created_by: user!.id,
        })
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['tasks', proposalId] })
      toast.success(`${items.length} opgaver oprettet`)
      onApplied()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setApplying(false) }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                className="input-base text-xs py-1 flex-1 font-medium"
                value={item.title}
                onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                placeholder="Aktivitetstitel"
              />
              {item.duration && <span className="text-[10px] text-muted whitespace-nowrap flex-shrink-0">{item.duration}</span>}
              <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-red-400 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
            <textarea
              className="input-base text-xs w-full leading-relaxed resize-none"
              rows={2}
              value={item.description ?? ''}
              onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              placeholder="Beskrivelse"
            />
          </div>
        ))}
      </div>
      <button
        disabled={items.length === 0 || applying}
        onClick={apply}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold py-2.5 hover:bg-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {applying ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
        Opret {items.length} aktiviteter som opgaver
      </button>
      <p className="text-[10px] text-muted/60 text-center">→ Tilføjer til: Opgaver</p>
    </div>
  )
}

// ── AIResultEditor router ─────────────────────────────
function AIResultEditor({ actionType, initialData, proposal, onApplied }: {
  actionType: string
  initialData: unknown
  proposal: ArrangementProposal
  onApplied: () => void
}) {
  if (actionType === 'theme-ideas')
    return <ThemeEditor initialItems={initialData as ThemeItem[]} proposal={proposal} onApplied={onApplied} />
  if (actionType === 'program-timeline')
    return <TimelineEditor initialItems={initialData as TimelineItem[]} proposalId={proposal.id} onApplied={onApplied} />
  if (actionType === 'budget-breakdown')
    return <BudgetEditorAI initialData={initialData as BudgetAIData} proposalId={proposal.id} proposal={proposal} onApplied={onApplied} />
  if (actionType === 'activities')
    return <ActivitiesEditorAI initialItems={initialData as ActivityItem[]} proposalId={proposal.id} onApplied={onApplied} />
  return <>{renderAIResult(actionType, initialData)}</>
}

// ── AIHelperPanel ─────────────────────────────────────
function AIHelperPanel({ proposal }: { proposal: ArrangementProposal }) {
  const qc = useQueryClient()
  const { data: history = [] } = useAISuggestions(proposal.id)
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ actionType: string; data: unknown } | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const AI_ACTIONS = [
    { key: 'theme-ideas',      label: 'Temaforslag',         icon: <Lightbulb size={13} />, desc: 'Koncepter og stemningsord' },
    { key: 'program-timeline', label: 'Program tidslinje',   icon: <CalendarDays size={13} />, desc: 'Et komplet forløb' },
    { key: 'budget-breakdown', label: 'Budgetfordeling',     icon: <DollarSign size={13} />, desc: 'Fordelt på kategorier' },
    { key: 'activities',       label: 'Aktivitetsforslag',   icon: <Play size={13} />, desc: 'Baseret på type og sæson' },
  ]

  const run = async (actionType: string) => {
    setLoading(actionType)
    setResult(null)
    try {
      const resp = await fetch('/api/workshop-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          actionType,
          context: { type: proposal.type, season: proposal.season, location: proposal.location, participants: proposal.expected_participants },
        }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Fejl')
      setResult({ actionType, data: json.suggestions })
      qc.invalidateQueries({ queryKey: ['ai_suggestions', proposal.id] })
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted leading-relaxed">AI hjælper genererer strukturerede forslag baseret på arrangementets type og sæson — ingen persondata deles.</p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {AI_ACTIONS.map((a) => (
          <button key={a.key} onClick={() => run(a.key)} disabled={!!loading}
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:border-gold/30 hover:bg-surface/60 disabled:opacity-40 ${loading === a.key ? 'border-gold/30 bg-gold/5' : 'border-border bg-surface/30'}`}>
            <div className={`mt-0.5 ${loading === a.key ? 'text-gold animate-pulse' : 'text-gold/60'}`}>{a.icon}</div>
            <div>
              <p className="text-xs font-medium text-parchment/90">{a.label}</p>
              <p className="text-[10px] text-muted">{a.desc}</p>
            </div>
            {loading === a.key && <RefreshCw size={11} className="ml-auto text-gold animate-spin mt-1 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* Result display */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gold/20 bg-charcoal/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gold">{AI_ACTIONS.find(a => a.key === result.actionType)?.label}</p>
              <button onClick={() => setResult(null)} className="p-1 text-muted hover:text-parchment"><X size={12} /></button>
            </div>
            <AIResultEditor
              actionType={result.actionType}
              initialData={result.data}
              proposal={proposal}
              onApplied={() => setResult(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div>
          <button onClick={() => setHistoryOpen((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted hover:text-parchment transition-colors">
            <Clock size={11} /> Tidligere forslag ({history.length})
            {historyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-1.5">
              {history.slice(0, 5).map((s) => (
                <div key={s.id} className="rounded-lg bg-surface border border-border/50 px-3 py-2 text-[10px] text-muted flex items-center gap-2">
                  <span className="text-parchment/60">{AI_ACTIONS.find(a => a.key === s.action_type)?.label ?? s.action_type}</span>
                  <span className="ml-auto">{new Date(s.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AuditLogPanel ─────────────────────────────────────
function AuditLogPanel({ proposalId }: { proposalId: string }) {
  const { data: log = [] } = useAuditLog(proposalId)
  const [open, setOpen] = useState(false)

  const ACTION_LABELS: Record<string, string> = {
    stage_changed:   'Fase ændret',
    budget_edited:   'Budget redigeret',
    owner_changed:   'Ansvarlig ændret',
    task_changed:    'Opgave ændret',
    program_changed: 'Program ændret',
    field_updated:   'Felt opdateret',
  }

  if (log.length === 0) return null

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-[11px] text-muted hover:text-parchment transition-colors">
        <Clock size={11} /> Aktivitetslog ({log.length}) {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-border overflow-hidden divide-y divide-border/40">
          {log.map((entry) => {
            const actor = entry.actor as { full_name: string; avatar_url?: string | null } | undefined
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                {actor && <Avatar src={actor.avatar_url} name={actor.full_name} size="xs" />}
                <span className="flex-1 text-parchment/70">
                  <span className="font-medium text-parchment/90">{actor?.full_name ?? 'Ukendt'}</span>
                  {' '}{ACTION_LABELS[entry.action] ?? entry.action}
                  {entry.details && typeof entry.details === 'object' && 'from' in entry.details && 'to' in entry.details && (
                    <span className="text-muted"> ({String(entry.details.from)} → {String(entry.details.to)})</span>
                  )}
                </span>
                <span className="text-muted/50 whitespace-nowrap font-mono">
                  {new Date(entry.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main WorkshopEditor
// ─────────────────────────────────────────────────────────────────────────────
type WorkshopTab = 'overview' | 'budget' | 'tasks' | 'program' | 'participants' | 'ai' | 'evaluation'

export function WorkshopEditor({ proposal: initialProposal, onClose }: { proposal: ArrangementProposal; onClose: () => void }) {
  const qc = useQueryClient()
  const update = useUpdateProposal()
  const del = useDeleteProposal()
  const logAudit = useLogAudit()
  const { profile } = useAuthStore()
  const { data: members = [] } = useMembers()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(initialProposal.id)
  const [proposal, setProposalLocal] = useState(initialProposal)
  const [activeTab, setActiveTab] = useState<WorkshopTab>('overview')
  const [saving, setSaving] = useState(false)

  // Sync proposal from server after updates
  // placeholderData keeps the previous value while refetching → no flash back to old stage
  const { data: freshProposal } = useQuery({
    queryKey: ['arrangement_proposals', proposal.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('arrangement_proposals')
        .select('*, creator:profiles!created_by(id, full_name, avatar_url), responsible_member:profiles!responsible_member_id(id, full_name, avatar_url), budget_responsible:profiles!budget_responsible_id(id, full_name, avatar_url)')
        .eq('id', proposal.id).single()
      return data as ArrangementProposal | null
    },
    staleTime: 10_000,
    placeholderData: (prev: ArrangementProposal | null | undefined) => prev ?? undefined,
  })
  const currentProposal = freshProposal ?? proposal

  const isOwner = currentProposal.created_by === profile?.id
  const isCollaborator = currentProposal.collaborator_ids.includes(profile?.id ?? '')
  const canEdit = isOwner || isCollaborator

  // Overview form
  const [form, setForm] = useState({
    title:              currentProposal.title,
    description:        currentProposal.description ?? '',
    type:               currentProposal.type ?? '',
    season:             currentProposal.season ?? '',
    estimated_budget:   currentProposal.estimated_budget?.toString() ?? '',
    location:           currentProposal.location ?? '',
    proposed_date:      currentProposal.proposed_date ?? '',
    proposed_date_from: currentProposal.proposed_date_from ?? '',
    proposed_date_to:   currentProposal.proposed_date_to ?? '',
    notes:              currentProposal.notes ?? '',
    idea_notes:         currentProposal.idea_notes ?? '',
    responsible_member_id: currentProposal.responsible_member_id ?? '',
    budget_responsible_id: currentProposal.budget_responsible_id ?? '',
  })
  const [collabIds, setCollabIds] = useState<string[]>(currentProposal.collaborator_ids)
  type LocationOption = { name: string; address: string; notes: string }
  const [locations, setLocations] = useState<LocationOption[]>(() => {
    try { return currentProposal.location_options ? JSON.parse(currentProposal.location_options) : [] } catch { return [] }
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Geocode a location string → {lat, lng} or null
  const geocode = async (loc: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1&countrycodes=dk`,
        { headers: { 'Accept-Language': 'da' } },
      )
      const d = await r.json()
      if (d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }
    } catch { /* non-fatal */ }
    return null
  }

  // Build the current form payload (reused by save and advanceStage)
  const formPayload = (extra?: Partial<ArrangementProposal>) => ({
    title:                form.title,
    description:          form.description || null,
    type:                 form.type || null,
    season:               form.season || null,
    estimated_budget:     form.estimated_budget ? parseFloat(form.estimated_budget) : null,
    location:             form.location || null,
    proposed_date:        form.proposed_date || null,
    proposed_date_from:   form.proposed_date_from || null,
    proposed_date_to:     form.proposed_date_to || null,
    notes:                form.notes || null,
    idea_notes:           form.idea_notes || null,
    collaborator_ids:     collabIds,
    location_options:     locations.length ? JSON.stringify(locations) : null,
    responsible_member_id: form.responsible_member_id || null,
    budget_responsible_id: form.budget_responsible_id || null,
    ...extra,
  })

  // Stage advance — saves all current form fields atomically with the stage change
  const advanceStage = async (to: LifecycleStage) => {
    await update.mutateAsync({ id: currentProposal.id, ...formPayload(), lifecycle_stage: to })
    logAudit.mutate({ proposal_id: currentProposal.id, actor_id: profile!.id, action: 'stage_changed', details: { from: currentProposal.lifecycle_stage, to } })
    qc.invalidateQueries({ queryKey: ['proposal_stage_history', currentProposal.id] })
  }

  const save = async () => {
    setSaving(true)
    // Geocode location if it changed
    let geoExtra: Partial<ArrangementProposal> = {}
    if (form.location && form.location !== currentProposal.location) {
      const coords = await geocode(form.location)
      if (coords) geoExtra = { lat: coords.lat, lng: coords.lng }
    }
    await update.mutateAsync({ id: currentProposal.id, ...formPayload(geoExtra) })
    logAudit.mutate({ proposal_id: currentProposal.id, actor_id: profile!.id, action: 'field_updated', details: { fields: Object.keys(form) } })
    setSaving(false)
    toast.success('Gemt')
  }

  // Create a linked calendar event from this proposal
  const [linkingCalendar, setLinkingCalendar] = useState(false)
  const linkToCalendar = async () => {
    if (!form.proposed_date_from) {
      toast.error('Sæt en startdato inden du opretter kalenderbegivenheden')
      return
    }
    setLinkingCalendar(true)
    try {
      // First save the current form so the API sees the latest title/description/location/date
      await update.mutateAsync({ id: currentProposal.id, ...formPayload() })

      const res = await fetch(`/api/proposals/${currentProposal.id}/create-event`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Ukendt fejl')

      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['arrangement_proposals', currentProposal.id] })
      toast.success('Oprettet i kalender!')
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Fejl ved oprettelse')
    } finally {
      setLinkingCalendar(false)
    }
  }

  // ── RSVP for the linked calendar event ───────────────────────────────────────
  const [rsvpingEvent, setRsvpingEvent] = useState(false)
  const { data: myEventRsvp } = useQuery({
    queryKey: ['event_my_rsvp', currentProposal.linked_event_id, profile?.id],
    enabled: !!currentProposal.linked_event_id && !!profile?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('event_participants')
        .select('rsvp')
        .eq('event_id', currentProposal.linked_event_id!)
        .eq('user_id', profile!.id)
        .maybeSingle()
      return data as { rsvp: string } | null
    },
  })
  const { data: eventAttendees = [] } = useQuery({
    queryKey: ['event_attendees', currentProposal.linked_event_id],
    enabled: !!currentProposal.linked_event_id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supa() as any)
        .from('event_participants')
        .select('rsvp, profile:profiles(id, full_name, avatar_url)')
        .eq('event_id', currentProposal.linked_event_id!)
      return (data ?? []) as Array<{ rsvp: string; profile: { id: string; full_name: string; avatar_url?: string | null } }>
    },
  })
  const rsvpLinkedEvent = async (status: 'attending' | 'maybe' | 'not_attending') => {
    if (!currentProposal.linked_event_id || !profile) return
    setRsvpingEvent(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supa() as any)
        .from('event_participants')
        .upsert(
          { event_id: currentProposal.linked_event_id, user_id: profile.id, rsvp: status, responded_at: new Date().toISOString() },
          { onConflict: 'event_id,user_id' },
        )
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['event_my_rsvp', currentProposal.linked_event_id, profile.id] })
      qc.invalidateQueries({ queryKey: ['event_attendees', currentProposal.linked_event_id] })
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('Tilmelding gemt')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setRsvpingEvent(false)
    }
  }

  // ── Add to own personal calendar ─────────────────────────────────────────────
  const addToGoogleCalendar = () => {
    if (!form.proposed_date_from) return
    const start = form.proposed_date_from.replace(/-/g, '') + 'T120000'
    const end = (form.proposed_date_to || form.proposed_date_from).replace(/-/g, '') + 'T200000'
    const url = new URL('https://calendar.google.com/calendar/r/eventedit')
    url.searchParams.set('text', form.title)
    url.searchParams.set('dates', `${start}/${end}`)
    if (form.description) url.searchParams.set('details', form.description)
    if (form.location) url.searchParams.set('location', form.location)
    window.open(url.toString(), '_blank')
  }
  const downloadIcal = () => {
    if (!form.proposed_date_from) return
    const start = form.proposed_date_from.replace(/-/g, '') + 'T120000'
    const end = (form.proposed_date_to || form.proposed_date_from).replace(/-/g, '') + 'T200000'
    const uid = currentProposal.linked_event_id ?? currentProposal.id
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hjortens Orden//DA',
      'BEGIN:VEVENT',
      `UID:${uid}@hjortensorden.dk`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${form.title}`,
      ...(form.description ? [`DESCRIPTION:${form.description.replace(/\n/g, '\\n')}`] : []),
      ...(form.location    ? [`LOCATION:${form.location}`] : []),
      'END:VEVENT', 'END:VCALENDAR',
    ]
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `${form.title.replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, '_').trim()}.ics`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(href)
  }

  const TABS: Array<{ key: WorkshopTab; label: string; icon: React.ReactNode; show?: boolean }> = ([
    { key: 'overview',     label: 'Overblik',    icon: <Hammer size={13} /> },
    { key: 'budget',       label: 'Budget',      icon: <DollarSign size={13} /> },
    { key: 'tasks',        label: 'Opgaver',     icon: <ListTodo size={13} /> },
    { key: 'program',      label: 'Program',     icon: <Clapperboard size={13} /> },
    { key: 'participants', label: 'Deltagere',   icon: <Users size={13} /> },
    { key: 'ai',           label: 'AI Hjælper',  icon: <Sparkles size={13} /> },
    { key: 'evaluation',   label: 'Evaluering',  icon: <BarChart2 size={13} />, show: STAGE_IDX[currentProposal.lifecycle_stage] >= STAGE_IDX['confirmed'] },
  ] as const as Array<{ key: WorkshopTab; label: string; icon: React.ReactNode; show?: boolean }>).filter((t) => t.show !== false)

  const responsible = currentProposal.responsible_member as { full_name: string; avatar_url?: string | null } | undefined
  const budgetResp  = currentProposal.budget_responsible as { full_name: string; avatar_url?: string | null } | undefined

  return (
    <div className="space-y-5">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted hover:text-parchment transition-colors flex-shrink-0">
          <ArrowLeft size={15} /> Tilbage
        </button>
        <div className="flex-1" />
        {/* Owners */}
        <div className="flex items-center gap-2">
          {responsible && (
            <div className="flex items-center gap-1.5 text-xs text-muted bg-surface border border-border rounded-full pl-1 pr-3 py-1">
              <Avatar src={responsible.avatar_url} name={responsible.full_name} size="xs" />
              <span>{responsible.full_name}</span>
            </div>
          )}
          {budgetResp && budgetResp.full_name !== responsible?.full_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted bg-surface border border-border rounded-full pl-1 pr-3 py-1">
              <Avatar src={budgetResp.avatar_url} name={budgetResp.full_name} size="xs" />
              <DollarSign size={10} className="text-gold/60" />
              <span>{budgetResp.full_name}</span>
            </div>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => { if (confirm('Slet dette forslag permanent?')) { del.mutate(currentProposal.id); onClose() } }}
            className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-red-900/10 transition-colors"
          ><Trash2 size={14} /></button>
        )}
      </div>

      {/* ── Title ── */}
      <div className="space-y-1">
        <input
          className="w-full bg-transparent border-none text-parchment font-serif text-2xl focus:outline-none placeholder:text-muted/30 border-b border-transparent pb-1 focus:border-gold/30 transition-colors"
          value={form.title}
          onChange={set('title')}
          placeholder="Arrangement titel…"
          disabled={!canEdit}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-base text-xs py-1" value={form.type} onChange={set('type')} disabled={!canEdit}>
            <option value="">Type…</option>
            {['Jagt','Fest','Kulturtur','Middag','Udendørs','Ceremoni','Andet'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="input-base text-xs py-1" value={form.season} onChange={set('season')} disabled={!canEdit}>
            <option value="">Sæson…</option>
            {['Forår','Sommer','Efterår','Vinter'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Lifecycle stepper ── */}
      <LifecycleStepper
        current={currentProposal.lifecycle_stage}
        onAdvance={advanceStage}
        proposal={{
          ...currentProposal,
          title:                form.title,
          responsible_member_id: form.responsible_member_id || null,
          estimated_budget:     form.estimated_budget ? parseFloat(form.estimated_budget) : null,
          location:             form.location || null,
          proposed_date_from:   form.proposed_date_from || null,
        }}
        taskCount={tasks.length}
        tasksLoading={tasksLoading}
        isOwner={isOwner}
      />

      {/* ── Publish status ── */}
      <PublishStatusBar
        status={currentProposal.publish_status}
        onPublish={async (to) => {
          await update.mutateAsync({ id: currentProposal.id, publish_status: to })
          logAudit.mutate({ proposal_id: currentProposal.id, actor_id: profile!.id, action: 'field_updated', details: { fields: ['publish_status'], from: currentProposal.publish_status, to } })
          // Auto-create calendar event the first time publish_status leaves 'draft'
          if (to !== 'draft' && !currentProposal.linked_event_id && form.proposed_date_from) {
            await linkToCalendar()
          } else if (to !== 'draft' && !currentProposal.linked_event_id && !form.proposed_date_from) {
            toast('💡 Sæt en startdato og klik "Opret i kalender" for at tilføje til kalenderen', { duration: 5000 })
          }
        }}
        isOwner={isOwner}
      />

      {/* ── Kalender + RSVP ── */}
      {currentProposal.publish_status !== 'draft' && (
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-4 space-y-4">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays size={13} className="text-gold/60" />
              {currentProposal.linked_event_id
                ? <span className="text-green-400 flex items-center gap-1"><Check size={11} /> Oprettet i kalender</span>
                : <span>Ikke oprettet i kalender endnu</span>
              }
            </div>
            {isOwner && !currentProposal.linked_event_id && (
              <Button variant="outline" size="sm" loading={linkingCalendar} onClick={linkToCalendar}>
                <CalendarDays size={12} /> Opret i kalender
              </Button>
            )}
            {currentProposal.linked_event_id && (
              <a
                href={`/events/${currentProposal.linked_event_id}`}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors"
              >
                <ExternalLink size={11} /> Åbn i kalender <ArrowRight size={10} />
              </a>
            )}
          </div>

          {/* RSVP + add-to-calendar — only when event is linked */}
          {currentProposal.linked_event_id && (
            <>
              {/* RSVP buttons */}
              <div>
                <p className="text-label-sm text-muted mb-2">Din tilmelding</p>
                <div className="flex gap-2">
                  {([
                    { key: 'attending',     label: '✓ Deltager',      active: 'bg-forest/30 text-green-300 border-forest/50' },
                    { key: 'maybe',         label: '? Måske',          active: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
                    { key: 'not_attending', label: '✗ Deltager ikke', active: 'bg-red-900/30 text-red-300 border-red-800/40' },
                  ] as const).map(({ key, label, active }) => (
                    <button
                      key={key}
                      disabled={rsvpingEvent}
                      onClick={() => rsvpLinkedEvent(key)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        myEventRsvp?.rsvp === key ? active : 'border-border text-muted hover:text-parchment hover:border-gold/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendee summary */}
              {eventAttendees.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Users size={12} />
                  <span>
                    {eventAttendees.filter((a) => a.rsvp === 'attending').length} deltager
                    {eventAttendees.filter((a) => a.rsvp === 'maybe').length > 0 &&
                      ` · ${eventAttendees.filter((a) => a.rsvp === 'maybe').length} måske`}
                    {eventAttendees.filter((a) => a.rsvp === 'not_attending').length > 0 &&
                      ` · ${eventAttendees.filter((a) => a.rsvp === 'not_attending').length} deltager ikke`}
                  </span>
                </div>
              )}

              {/* Add to own calendar */}
              {form.proposed_date_from && (
                <div className="flex gap-2 pt-1 border-t border-border/40">
                  <button
                    onClick={addToGoogleCalendar}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-parchment border border-border hover:border-gold/20 rounded-lg px-3 py-1.5 transition-all"
                  >
                    <ExternalLink size={11} /> Google Kalender
                  </button>
                  <button
                    onClick={downloadIcal}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-parchment border border-border hover:border-gold/20 rounded-lg px-3 py-1.5 transition-all"
                  >
                    <Download size={11} /> Download .ics
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab nav ── */}
      <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === t.key ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-parchment'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="min-h-[280px]">

        {/* OVERBLIK */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Owners */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Arrangementansvarlig</label>
                <select className="input-base w-full text-sm" value={form.responsible_member_id} onChange={set('responsible_member_id')} disabled={!isOwner}>
                  <option value="">Vælg…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Budgetansvarlig</label>
                <select className="input-base w-full text-sm" value={form.budget_responsible_id} onChange={set('budget_responsible_id')} disabled={!isOwner}>
                  <option value="">Kasserer (standard)</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-label-sm text-muted mb-1.5">Datoer</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[10px] text-muted mb-1">Fra</p>
                  <input type="date" className="input-base w-full [color-scheme:dark]" value={form.proposed_date_from} onChange={set('proposed_date_from')} disabled={!canEdit} />
                </div>
                <div>
                  <p className="text-[10px] text-muted mb-1">Til</p>
                  <input type="date" className="input-base w-full [color-scheme:dark]" value={form.proposed_date_to} onChange={set('proposed_date_to')} disabled={!canEdit} />
                </div>
              </div>
              <input className="input-base w-full text-sm" value={form.proposed_date} onChange={set('proposed_date')} placeholder="Alternativ periode (fri tekst)" disabled={!canEdit} />
            </div>

            {/* Location + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Lokation</label>
                <input className="input-base w-full" value={form.location} onChange={set('location')} placeholder="Nordsjælland…" disabled={!canEdit} />
              </div>
              <div>
                <label className="block text-label-sm text-muted mb-1.5">Samlet budget (DKK)</label>
                <input type="number" className="input-base w-full" value={form.estimated_budget} onChange={set('estimated_budget')} placeholder="0" disabled={!canEdit} />
              </div>
            </div>

            {/* Locations list */}
            {canEdit && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-label-sm text-muted">Lokationskandidater</label>
                  <Button variant="ghost" size="sm" onClick={() => setLocations((l) => [...l, { name: '', address: '', notes: '' }])}><Plus size={12} /></Button>
                </div>
                {locations.map((loc, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface/40 p-3 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-gold/10 text-gold text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                      <input className="input-base flex-1 text-sm py-1.5" value={loc.name} onChange={(e) => setLocations((l) => l.map((x,j) => j===i ? {...x,name:e.target.value} : x))} placeholder="Navn…" />
                      <button onClick={() => setLocations((l) => l.filter((_,j) => j!==i))} className="p-1 text-muted hover:text-red-400 flex-shrink-0"><X size={13} /></button>
                    </div>
                    <input className="input-base w-full text-sm py-1.5" value={loc.address} onChange={(e) => setLocations((l) => l.map((x,j) => j===i ? {...x,address:e.target.value} : x))} placeholder="Adresse / link…" />
                    <input className="input-base w-full text-sm py-1.5" value={loc.notes} onChange={(e) => setLocations((l) => l.map((x,j) => j===i ? {...x,notes:e.target.value} : x))} placeholder="Noter…" />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-label-sm text-muted mb-1.5">Beskrivelse</label>
              <textarea rows={3} className="input-base w-full resize-none" value={form.description} onChange={set('description')} placeholder="Beskriv arrangementet…" disabled={!canEdit} />
            </div>

            {/* Idéer */}
            <div>
              <label className="block text-label-sm text-muted mb-1.5">Idéer & Koncept <span className="font-normal text-muted/50 normal-case">(noter, links, tanker)</span></label>
              <textarea rows={6} className="input-base w-full resize-none font-mono text-xs leading-relaxed" value={form.idea_notes} onChange={set('idea_notes')} placeholder={'# Ideer\n\n- Idé 1\n- Idé 2\n\n## Links\n- https://...'} disabled={!canEdit} />
            </div>

            {/* Internal notes */}
            <div>
              <label className="block text-label-sm text-muted mb-1.5">Interne noter <span className="font-normal text-muted/50 normal-case">(kun gruppen)</span></label>
              <textarea rows={2} className="input-base w-full resize-none" value={form.notes} onChange={set('notes')} placeholder="Budget noter, kontaktpersoner…" disabled={!canEdit} />
            </div>

            {/* Collaborators */}
            <div>
              <label className="block text-label-sm text-muted mb-2">Samarbejdspartnere</label>
              <div className="rounded-xl border border-border divide-y divide-border/40 overflow-hidden">
                {members.filter((m) => m.id !== profile?.id).map((m) => (
                  <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface/50 transition-colors">
                    <input type="checkbox" className="accent-gold" checked={collabIds.includes(m.id)} onChange={() => setCollabIds((p) => p.includes(m.id) ? p.filter((c) => c !== m.id) : [...p, m.id])} disabled={!isOwner} />
                    <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                    <span className="flex-1 text-sm text-parchment/80">{m.full_name}</span>
                    {collabIds.includes(m.id) && <span className="text-[10px] text-green-400">Samarbejder</span>}
                  </label>
                ))}
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="gold" loading={saving} onClick={save}><Save size={13} /> Gem ændringer</Button>
              </div>
            )}
          </div>
        )}

        {/* BUDGET */}
        {activeTab === 'budget' && <BudgetModule proposalId={currentProposal.id} proposal={currentProposal} isOwner={canEdit} />}

        {/* TASKS */}
        {activeTab === 'tasks' && <TasksModule proposalId={currentProposal.id} isOwner={canEdit} />}

        {/* PROGRAM */}
        {activeTab === 'program' && <ProgramModule proposalId={currentProposal.id} isOwner={canEdit} />}

        {/* PARTICIPANTS */}
        {activeTab === 'participants' && (
          <ParticipantsModule
            proposal={currentProposal}
            isOwner={canEdit}
            eventAttendees={eventAttendees}
            myEventRsvp={myEventRsvp}
            onEventRsvp={rsvpLinkedEvent}
          />
        )}

        {/* AI HELPER */}
        {activeTab === 'ai' && <AIHelperPanel proposal={currentProposal} />}

        {/* EVALUATION */}
        {activeTab === 'evaluation' && <EvaluationModule proposal={currentProposal} isOwner={canEdit} />}
      </div>

      {/* ── Audit log ── */}
      <div className="pt-4 border-t border-border/50">
        <AuditLogPanel proposalId={currentProposal.id} />
      </div>
    </div>
  )
}
