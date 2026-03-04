'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TreasuryTransaction, PaymentRecord, TreasuryForecast, RecurringTransaction } from '@/lib/types'
import { formatDKK, exportToCSV, getMonthKey } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format, addMonths } from 'date-fns'
import { useAuthReady } from './use-auth-ready'

const supabase = createClient()

export function useTreasuryBalance() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'balance'],
    staleTime: 60_000,
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_balance')
        .select('*')
        .single()
      if (error) throw error
      return data as { total_income: number; total_expenses: number; balance: number }
    },
  })
}

export function useTreasuryTransactions(limit = 50) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'transactions', limit],
    staleTime: 60_000,
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_transactions')
        .select('*, registrar:profiles!treasury_transactions_registered_by_fkey(id, full_name)')
        .order('transaction_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as unknown as TreasuryTransaction[]
    },
  })
}

export function usePaymentRecords(month?: string) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'payments', month],
    staleTime: 60_000,
    enabled: authReady,
    queryFn: async () => {
      let query = supabase
        .from('payment_records')
        .select('*, member:profiles!payment_records_user_id_fkey(id, full_name, email)')
        .order('period_month', { ascending: false })
      if (month) query = query.eq('period_month', month)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as PaymentRecord[]
    },
  })
}

export function useTreasuryForecast(months = 6) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'forecast', months],
    staleTime: 5 * 60_000,
    enabled: authReady,
    queryFn: async () => {
      // Get active member count, current balance, and configured monthly fee
      const [balanceRes, membersRes, settingRes] = await Promise.all([
        supabase.from('treasury_balance').select('balance').single(),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'active'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('treasury_settings').select('monthly_fee_dkk').maybeSingle(),
      ])

      const balance = balanceRes.data?.balance ?? 0
      const memberCount = membersRes.count ?? 0
      const feePerMember = Number(settingRes.data?.monthly_fee_dkk ?? 300)
      const monthlyIncome = memberCount * feePerMember

      const forecast: TreasuryForecast[] = []
      let runningBalance = balance

      for (let i = 1; i <= months; i++) {
        const month = format(addMonths(new Date(), i), 'yyyy-MM')
        runningBalance += monthlyIncome
        forecast.push({ month, expected_income: monthlyIncome, projected_balance: runningBalance })
      }
      return forecast
    },
  })
}

export function useRegisterTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx: {
      type: 'income' | 'expense'
      amount_dkk: number
      description: string
      category?: string
      event_id?: string
      transaction_date: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('treasury_transactions')
        .insert({ ...tx, registered_by: user.id, event_id: tx.event_id ?? null, category: tx.category ?? null })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Transaktion registreret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, month, memberName }: { userId: string; month?: string; memberName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const periodMonth = month ?? getMonthKey()

      // Check if this member already has a paid record (to avoid duplicate transactions)
      const { data: existing } = await supabase
        .from('payment_records')
        .select('status')
        .eq('user_id', userId)
        .eq('period_month', periodMonth)
        .maybeSingle()
      const alreadyPaid = existing?.status === 'paid'

      // Read the current configured fee from settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: setting } = await (supabase as any)
        .from('treasury_settings')
        .select('monthly_fee_dkk')
        .maybeSingle()
      const amount = Number(setting?.monthly_fee_dkk ?? 300)

      // Upsert payment record
      const { error } = await supabase
        .from('payment_records')
        .upsert({
          user_id: userId,
          period_month: periodMonth,
          amount_dkk: amount,
          paid_at: new Date().toISOString(),
          status: 'paid',
          registered_by: user.id,
        }, { onConflict: 'user_id,period_month' })
      if (error) throw error

      // Only create a treasury transaction for NEW payments (not re-registrations)
      // so that the balance view reflects each paid kontingent
      if (!alreadyPaid) {
        const label = memberName
          ? `Kontingent ${periodMonth} — ${memberName}`
          : `Kontingent ${periodMonth}`
        const { error: txErr } = await supabase
          .from('treasury_transactions')
          .insert({
            type: 'income' as const,
            amount_dkk: amount,
            description: label,
            category: 'Kontingent',
            registered_by: user.id,
            event_id: null,
            transaction_date: new Date().toISOString().slice(0, 10),
          })
        if (txErr) throw txErr
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Betaling registreret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTreasurySetting() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'settings'],
    staleTime: 5 * 60_000,
    enabled: authReady,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('treasury_settings')
        .select('id, monthly_fee_dkk, updated_at')
        .maybeSingle()
      if (error) throw error
      return data as { id: string; monthly_fee_dkk: number; updated_at: string } | null
    },
  })
}

export function useUpdateTreasurySetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (monthly_fee_dkk: number) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('treasury_settings')
        .select('id')
        .maybeSingle()
      if (!existing) throw new Error('Indstillinger ikke fundet')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('treasury_settings')
        .update({ monthly_fee_dkk, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Kontingentbeløb opdateret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useExportTransactionsCSV() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('treasury_transactions')
        .select('transaction_date, type, description, category, amount_dkk')
        .order('transaction_date', { ascending: false })
      if (error) throw error
      exportToCSV(
        data.map((d) => ({
          Dato: d.transaction_date,
          Type: d.type === 'income' ? 'Indtægt' : 'Udgift',
          Beskrivelse: d.description,
          Kategori: d.category ?? '',
          Beløb: formatDKK(d.amount_dkk),
        })),
        `hjortens-orden-kasserer-${getMonthKey()}`
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('treasury_transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Transaktion slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx: {
      id: string
      type: 'income' | 'expense'
      amount_dkk: number
      description: string
      category?: string
      transaction_date: string
    }) => {
      const { id, ...fields } = tx
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('treasury_transactions').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Transaktion opdateret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Recurring transactions ────────────────────────────────

export function useRecurringTransactions() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'recurring'],
    staleTime: 5 * 60_000,
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, creator:profiles!created_by(id, full_name)')
        .order('next_run_date', { ascending: true })
      if (error) throw error
      return data as unknown as RecurringTransaction[]
    },
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rec: {
      type: 'income' | 'expense'
      amount_dkk: number
      description: string
      category?: string
      recurrence: 'monthly' | 'quarterly' | 'yearly'
      next_run_date: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('recurring_transactions').insert({ ...rec, created_by: user.id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury', 'recurring'] })
      toast.success('Fast transaktion oprettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury', 'recurring'] })
      toast.success('Fast transaktion slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRunRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rec: RecurringTransaction) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create the actual transaction
      const { error: txErr } = await supabase
        .from('treasury_transactions')
        .insert({
          type: rec.type as 'income' | 'expense',
          amount_dkk: rec.amount_dkk,
          description: rec.description,
          category: rec.category ?? null,
          event_id: null,
          transaction_date: new Date().toISOString().slice(0, 10),
          registered_by: user.id,
        })
      if (txErr) throw txErr

      // Advance next_run_date
      const next = new Date(rec.next_run_date)
      if (rec.recurrence === 'monthly')     next.setMonth(next.getMonth() + 1)
      else if (rec.recurrence === 'quarterly') next.setMonth(next.getMonth() + 3)
      else                                  next.setFullYear(next.getFullYear() + 1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('recurring_transactions').update({
        last_run_date: new Date().toISOString().slice(0, 10),
        next_run_date: next.toISOString().slice(0, 10),
      }).eq('id', rec.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] })
      toast.success('Transaktion kørt og bogført')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useToggleAutoPay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, autoPay }: { userId: string; autoPay: boolean }) => {
      const res = await fetch(`/api/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_pay: autoPay }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fejl ved opdatering' }))
        throw new Error(err.error ?? 'Fejl ved opdatering')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// Returns a map of { [userId]: latestSentAt } for the given month
export function usePaymentReminderLog(month?: string) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['treasury', 'reminder-log', month],
    staleTime: 60_000,
    enabled: authReady && !!month,
    queryFn: async () => {
      const res = await fetch(`/api/treasury/send-reminders?month=${month}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fejl' }))
        throw new Error(err.error ?? 'Kunne ikke hente påmindelseslog')
      }
      const json = await res.json() as { log: Record<string, string> }
      return json.log // { [userId]: latestSentAt }
    },
  })
}
