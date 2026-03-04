'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  Download, Plus, Pencil, Trash2, Play, RepeatIcon, Check, X, Mail, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  useTreasuryBalance, useTreasuryTransactions,
  usePaymentRecords, useTreasuryForecast,
  useExportTransactionsCSV, useRegisterTransaction, useRegisterPayment,
  useDeleteTransaction, useUpdateTransaction,
  useRecurringTransactions, useCreateRecurring, useDeleteRecurring, useRunRecurring,
  useTreasurySetting, useUpdateTreasurySetting, useToggleAutoPay,
} from '@/lib/hooks/use-treasury'
import { useMembers } from '@/lib/hooks/use-members'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PaymentBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageLoader, Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { formatDKK, formatDate, getMonthKey } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/lib/stores/auth-store'
import { format, addMonths } from 'date-fns'
import toast from 'react-hot-toast'
import type { TreasuryTransaction, RecurringTransaction } from '@/lib/types'

type TabKey = 'overview' | 'payments' | 'transactions' | 'recurring'

export function TreasuryContent() {
  const [tab, setTab] = useState<TabKey>('overview')
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<TreasuryTransaction | null>(null)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [payMonth, setPayMonth] = useState(getMonthKey())
  const [feeEditing, setFeeEditing] = useState(false)
  const [feeInput, setFeeInput] = useState('')
  const [balCorrOpen, setBalCorrOpen] = useState(false)
  const [registeringAll, setRegisteringAll] = useState(false)
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const { can } = useAuthStore()

  const { data: balance, isLoading: balLoading } = useTreasuryBalance()
  const { data: transactions = [], isLoading: txLoading } = useTreasuryTransactions(200)
  const { data: payments = [] } = usePaymentRecords(payMonth)
  const { data: forecast = [] } = useTreasuryForecast(6)
  const { data: members = [] } = useMembers()
  const { data: recurring = [] } = useRecurringTransactions()
  const { data: feeSetting } = useTreasurySetting()
  const updateFee = useUpdateTreasurySetting()
  const exportCSV = useExportTransactionsCSV()
  const registerPayment = useRegisterPayment()
  const deleteTx = useDeleteTransaction()
  const runRecurring = useRunRecurring()
  const deleteRecurring = useDeleteRecurring()
  const toggleAutoPay = useToggleAutoPay()

  const activeMembers = members.filter((m) => m.status === 'active')
  const paidThisMonth = payments.filter((p) => p.status === 'paid').length
  const pendingThisMonth = activeMembers.length - paidThisMonth

  const currentFee = Number(feeSetting?.monthly_fee_dkk ?? 300)

  function handleSaveFee() {
    const val = parseFloat(feeInput.replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    updateFee.mutate(val, { onSuccess: () => setFeeEditing(false) })
  }

  async function handleSendReminders() {
    if (pendingThisMonth === 0) {
      toast('Alle er registreret som betalt for denne måned', { icon: '✓' })
      return
    }
    setSendingReminders(true)
    try {
      const res = await fetch('/api/treasury/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: payMonth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fejl ved afsendelse')
      if (data.sent === 0 && data.errors?.length > 0) {
        toast.error(`Afsendelse fejlede: ${data.errors[0]}`)
      } else if (data.sent < data.total) {
        toast(`${data.sent} af ${data.total} sendt — ${data.errors?.length ?? 0} fejlede`, { icon: '⚠️' })
      } else {
        toast.success(`${data.sent} af ${data.total} påmindelser sendt`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fejl ved afsendelse')
    } finally {
      setSendingReminders(false)
    }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',     label: 'Oversigt' },
    { key: 'payments',     label: 'Kontingenter' },
    { key: 'transactions', label: 'Transaktioner' },
    { key: 'recurring',    label: 'Faste' },
  ]

  if (balLoading) return <PageLoader />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Kasserer</h1>
        </div>
        <div className="flex items-center gap-2">
          {can('export_financials') && (
            <Button variant="ghost" size="sm" onClick={() => exportCSV.mutate()} loading={exportCSV.isPending}>
              <Download size={16} /> Eksporter CSV
            </Button>
          )}
          {can('register_payments') && (
            <Button variant="outline" size="sm" onClick={() => setBalCorrOpen(true)}>
              <Pencil size={15} /> Korriger saldo
            </Button>
          )}
          {can('register_payments') && (
            <Button variant="gold" size="sm" onClick={() => setTxOpen(true)}>
              <Plus size={16} /> Ny transaktion
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Aktuel Saldo"
          value={formatDKK(balance?.balance ?? 0)}
          icon={<DollarSign size={20} />}
          className={balance && balance.balance > 0 ? 'border-forest/20' : 'border-red-800/20'}
        />
        <StatCard label="Total Indtægt" value={formatDKK(balance?.total_income ?? 0)} icon={<TrendingUp size={20} />} />
        <StatCard label="Total Udgifter" value={formatDKK(balance?.total_expenses ?? 0)} icon={<TrendingDown size={20} />} />
        <StatCard
          label="Kontingent Status"
          value={`${paidThisMonth}/${activeMembers.length}`}
          subtext={`${pendingThisMonth} afventer betaling`}
          icon={<Users size={20} />}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'text-gold border-gold'
                : 'text-muted border-transparent hover:text-parchment hover:border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-charcoal border border-border rounded-xl p-6">
            <h3 className="font-serif text-heading-sm text-parchment mb-5">Saldoprognose (6 måneder)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a7a49" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1a7a49" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatDKK(v), 'Saldo']}
                  contentStyle={{ background: '#1c2028', border: '1px solid #2e3540', borderRadius: 8 }}
                  labelStyle={{ color: '#e8e0d0' }}
                />
                <Area type="monotone" dataKey="projected_balance" stroke="#1a7a49" fill="url(#balGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-charcoal border border-border rounded-xl p-6">
            <h3 className="font-serif text-heading-sm text-parchment mb-5">Forventet månedlig omsætning</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatDKK(v)]} contentStyle={{ background: '#1c2028', border: '1px solid #2e3540', borderRadius: 8 }} />
                <Bar dataKey="expected_income" name="Forventet" fill="#cfa84a" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 bg-charcoal border border-border rounded-xl p-6">
            <h3 className="font-serif text-heading-sm text-parchment mb-4">Seneste Transaktioner</h3>
            {txLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="divide-y divide-border/50">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-forest' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm text-parchment font-medium">{tx.description}</p>
                        <p className="text-xs text-muted">
                          {formatDate(tx.transaction_date)} · {(tx.registrar as { full_name: string })?.full_name}
                          {tx.category && ` · ${tx.category}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium font-mono ${tx.type === 'income' ? 'text-forest-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatDKK(tx.amount_dkk)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <div className="bg-charcoal border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-heading-sm text-parchment">Kontingenter</h3>
            <div className="flex items-center gap-2">
              {can('register_payments') && pendingThisMonth > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={sendingReminders}
                  title="Send e-mail påmindelser til ubetalt medlemmer"
                  onClick={handleSendReminders}
                >
                  <Mail size={13} /> Send påmindelser ({pendingThisMonth})
                </Button>
              )}
              {can('register_payments') && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={registeringAll}
                  onClick={async () => {
                    const unpaid = activeMembers.filter(
                      (m) => !payments.find((p) => p.user_id === m.id && p.status === 'paid')
                    )
                    if (unpaid.length === 0) {
                      toast('Alle er allerede registreret som betalt', { icon: '✓' })
                      return
                    }
                    setRegisteringAll(true)
                    let count = 0
                    for (const m of unpaid) {
                      try {
                        await registerPayment.mutateAsync({ userId: m.id, month: payMonth, memberName: m.full_name })
                        count++
                      } catch {
                        // continue even if one fails
                      }
                    }
                    setRegisteringAll(false)
                    toast.success(`${count} af ${unpaid.length} betalinger registreret`)
                  }}
                >
                  <Users size={13} /> Modtag alle
                </Button>
              )}
              <Input type="month" className="w-auto" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} />
            </div>
          </div>

          {/* Fee setting callout */}
          <div className="flex items-center justify-between bg-surface/40 border border-border/50 rounded-lg px-4 py-3 mb-5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Månedligt kontingent</p>
                {feeEditing ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      className="w-28 h-7 text-sm py-0 px-2"
                      value={feeInput}
                      onChange={(e) => setFeeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveFee()
                        if (e.key === 'Escape') setFeeEditing(false)
                      }}
                      autoFocus
                    />
                    <span className="text-xs text-muted">kr/md.</span>
                    <button
                      onClick={handleSaveFee}
                      disabled={updateFee.isPending}
                      className="p-1.5 rounded text-forest hover:text-forest/80 transition-colors disabled:opacity-50"
                      title="Gem"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setFeeEditing(false)}
                      className="p-1.5 rounded text-muted hover:text-parchment transition-colors"
                      title="Annuller"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-base font-semibold font-mono text-parchment">{formatDKK(currentFee)}<span className="text-xs text-muted font-sans font-normal ml-1">/md.</span></p>
                )}
              </div>
            </div>
            {can('register_payments') && !feeEditing && (
              <button
                onClick={() => { setFeeInput(String(currentFee)); setFeeEditing(true) }}
                className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors border border-gold/20 hover:border-gold/40 rounded-lg px-3 py-1.5"
              >
                <Pencil size={12} /> Rediger beløb
              </button>
            )}
          </div>

          <div className="divide-y divide-border/50">
            {activeMembers.map((member) => {
              const payment = payments.find((p) => p.user_id === member.id)
              const status = payment?.status ?? 'pending'
              return (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-parchment">{member.full_name}</p>
                        {member.auto_pay && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gold border border-gold/25 rounded-full px-1.5 py-0.5 leading-none">
                            <Zap size={9} /> Auto
                          </span>
                        )}
                      </div>
                      {payment?.paid_at && <p className="text-xs text-muted">Betalt {formatDate(payment.paid_at)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaymentBadge status={status} />
                    {can('register_payments') && (
                      <button
                        onClick={() => toggleAutoPay.mutate({ userId: member.id, autoPay: !member.auto_pay })}
                        title={member.auto_pay ? 'Deaktiver automatisk betaling' : 'Aktivér automatisk betaling'}
                        className={`p-1.5 rounded transition-colors ${
                          member.auto_pay
                            ? 'text-gold hover:text-gold/60'
                            : 'text-muted hover:text-gold'
                        }`}
                      >
                        <RepeatIcon size={13} />
                      </button>
                    )}
                    {can('register_payments') && status !== 'paid' && (
                      <Button
                        variant="green"
                        size="sm"
                        loading={registeringId === member.id}
                        onClick={async () => {
                          setRegisteringId(member.id)
                          try {
                            await registerPayment.mutateAsync({ userId: member.id, month: payMonth, memberName: member.full_name })
                          } finally {
                            setRegisteringId(null)
                          }
                        }}
                      >
                        Registrer betaling
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Transactions ── */}
      {tab === 'transactions' && (
        <div className="bg-charcoal border border-border rounded-xl p-6">
          <h3 className="font-serif text-heading-sm text-parchment mb-4">Alle Transaktioner</h3>
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-start justify-between py-3 gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-forest' : 'bg-red-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-parchment font-medium">{tx.description}</p>
                    <p className="text-xs text-muted">
                      {formatDate(tx.transaction_date)} · {(tx.registrar as { full_name: string })?.full_name}
                      {tx.category && <span className="ml-1.5 px-1.5 py-0.5 bg-surface rounded text-[10px]">{tx.category}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-medium font-mono ${tx.type === 'income' ? 'text-forest-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatDKK(tx.amount_dkk)}
                  </span>
                  {can('register_payments') && (
                    <>
                      <button
                        onClick={() => setEditTx(tx)}
                        className="p-1.5 rounded text-muted hover:text-parchment hover:bg-surface transition-colors"
                        title="Rediger"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Slet denne transaktion?')) deleteTx.mutate(tx.id) }}
                        className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Slet"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recurring ── */}
      {tab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Faste transaktioner køres manuelt ved forfald — fx månedlig kontingentindtægt.</p>
            {can('register_payments') && (
              <Button variant="gold" size="sm" onClick={() => setRecurringOpen(true)}>
                <Plus size={16} /> Ny fast transaktion
              </Button>
            )}
          </div>
          {recurring.length === 0 ? (
            <div className="bg-charcoal border border-border rounded-xl p-10 text-center text-muted">
              <RepeatIcon size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Ingen faste transaktioner endnu.</p>
              <p className="text-xs mt-1">Opret fx en månedlig kontingentindtægt herover.</p>
            </div>
          ) : (
            <div className="bg-charcoal border border-border rounded-xl divide-y divide-border/50">
              {recurring.map((rec) => {
                const isDue = new Date(rec.next_run_date) <= new Date()
                return (
                  <div key={rec.id} className="flex items-center justify-between px-6 py-4 gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rec.type === 'income' ? 'bg-forest' : 'bg-red-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-parchment font-medium">{rec.description}</p>
                        <p className="text-xs text-muted">
                          {formatDKK(rec.amount_dkk)} · {rec.recurrence === 'monthly' ? 'Månedlig' : rec.recurrence === 'quarterly' ? 'Kvartalsvis' : 'Årlig'}
                          {rec.category && ` · ${rec.category}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-xs font-mono ${isDue ? 'text-gold' : 'text-muted'}`}>
                          {isDue ? '⚡ Forfalden' : `Næste: ${formatDate(rec.next_run_date)}`}
                        </p>
                        {rec.last_run_date && (
                          <p className="text-[10px] text-muted">Sidst: {formatDate(rec.last_run_date)}</p>
                        )}
                      </div>
                      {can('register_payments') && (
                        <>
                          <Button
                            variant={isDue ? 'gold' : 'outline'}
                            size="sm"
                            loading={runRecurring.isPending}
                            onClick={() => runRecurring.mutate(rec)}
                            title="Kør nu og bogfør transaktion"
                          >
                            <Play size={12} /> Kør
                          </Button>
                          <button
                            onClick={() => { if (confirm('Slet denne faste transaktion?')) deleteRecurring.mutate(rec.id) }}
                            className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <TransactionModal open={txOpen} onClose={() => setTxOpen(false)} />
      {editTx && <TransactionModal open onClose={() => setEditTx(null)} existing={editTx} />}
      <RecurringModal open={recurringOpen} onClose={() => setRecurringOpen(false)} />
      <BalanceCorrectionModal open={balCorrOpen} onClose={() => setBalCorrOpen(false)} />
    </motion.div>
  )
}

// ── Transaction create / edit modal ──────────────────────────

function TransactionModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: TreasuryTransaction }) {
  const registerTx = useRegisterTransaction()
  const updateTx   = useUpdateTransaction()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    type: 'income' | 'expense'
    amount_dkk: number
    description: string
    category: string
    transaction_date: string
  }>({
    defaultValues: existing
      ? { type: existing.type, amount_dkk: existing.amount_dkk, description: existing.description, category: existing.category ?? '', transaction_date: existing.transaction_date }
      : { type: 'expense', transaction_date: new Date().toISOString().slice(0, 10) },
  })

  const onSubmit = async (data: Parameters<typeof registerTx.mutateAsync>[0]) => {
    if (existing) {
      await updateTx.mutateAsync({ id: existing.id, ...data })
    } else {
      await registerTx.mutateAsync(data)
    }
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Rediger transaktion' : 'Registrer transaktion'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button
            variant="gold"
            loading={isSubmitting || registerTx.isPending || updateTx.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {existing ? 'Gem' : 'Registrer'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Select label="Type" options={[{ value: 'expense', label: 'Udgift' }, { value: 'income', label: 'Indtægt' }]} {...register('type')} />
        <Input label="Beløb (DKK)" type="number" step="0.01" placeholder="0.00" {...register('amount_dkk')} />
        <Input label="Beskrivelse" placeholder="Hvad dækker transaktionen?" {...register('description')} />
        <Input label="Kategori" placeholder="Mad, Transport, Udstyr…" {...register('category')} />
        <Input label="Dato" type="date" {...register('transaction_date')} />
      </form>
    </Modal>
  )
}

// ── Recurring transaction create modal ───────────────────────

function RecurringModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRecurring()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    type: 'income' | 'expense'
    amount_dkk: number
    description: string
    category: string
    recurrence: 'monthly' | 'quarterly' | 'yearly'
    next_run_date: string
  }>({
    defaultValues: {
      type: 'income',
      recurrence: 'monthly',
      next_run_date: format(addMonths(new Date(), 1), 'yyyy-MM-01'),
    },
  })

  const onSubmit = async (data: Parameters<typeof create.mutateAsync>[0]) => {
    await create.mutateAsync(data)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ny fast transaktion"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button variant="gold" loading={isSubmitting || create.isPending} onClick={handleSubmit(onSubmit)}>
            Opret
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Select label="Type" options={[{ value: 'income', label: 'Indtægt' }, { value: 'expense', label: 'Udgift' }]} {...register('type')} />
        <Input label="Beløb (DKK)" type="number" step="0.01" placeholder="0.00" {...register('amount_dkk')} />
        <Input label="Beskrivelse" placeholder="Fx 'Månedligt kontingent'" {...register('description')} />
        <Input label="Kategori (valgfri)" placeholder="Kontingent, Leje, …" {...register('category')} />
        <Select
          label="Gentagelse"
          options={[
            { value: 'monthly',   label: 'Månedlig' },
            { value: 'quarterly', label: 'Kvartalsvis' },
            { value: 'yearly',    label: 'Årlig' },
          ]}
          {...register('recurrence')}
        />
        <Input label="Første forfaldsdato" type="date" {...register('next_run_date')} />
      </form>
    </Modal>
  )
}

// ── Balance correction modal ─────────────────────────────────

function BalanceCorrectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const registerTx = useRegisterTransaction()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    direction: 'positive' | 'negative'
    amount_dkk: number
    description: string
    transaction_date: string
  }>({
    defaultValues: {
      direction: 'positive',
      transaction_date: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = async (data: { direction: string; amount_dkk: number; description: string; transaction_date: string }) => {
    await registerTx.mutateAsync({
      type: data.direction === 'positive' ? 'income' : 'expense',
      amount_dkk: Number(data.amount_dkk),
      description: data.description || 'Saldokorrektion',
      category: 'Saldokorrektion',
      transaction_date: data.transaction_date,
    })
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Korriger saldo"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button
            variant="gold"
            loading={isSubmitting || registerTx.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            Bogfør korrektion
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted leading-relaxed rounded-lg bg-surface/60 border border-border/40 px-3 py-2.5">
          Opret en manuel regulering af kassens saldo. Korrektionen bogføres som en transaktion med kategorien <span className="text-parchment/80">Saldokorrektion</span> og fremgår på transaktionsoversigten.
        </p>
        <form className="space-y-4">
          <Select
            label="Retning"
            options={[
              { value: 'positive', label: '+ Indsat i kassen (øger saldo)' },
              { value: 'negative', label: '− Trukket fra kassen (reducerer saldo)' },
            ]}
            {...register('direction')}
          />
          <Input label="Beløb (DKK)" type="number" step="0.01" placeholder="0.00" {...register('amount_dkk')} />
          <Input label="Beskrivelse" placeholder="Fx 'Regulering af tidligere fejl'" {...register('description')} />
          <Input label="Dato" type="date" {...register('transaction_date')} />
        </form>
      </div>
    </Modal>
  )
}
