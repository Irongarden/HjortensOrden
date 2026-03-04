'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Poll, PollVote, PollStatus } from '@/lib/types'
import toast from 'react-hot-toast'

const supabase = createClient()

export function usePolls(status?: PollStatus) {
  return useQuery({
    queryKey: ['polls', status],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      let query = supabase
        .from('polls')
        .select(`
          *,
          creator:profiles!polls_created_by_fkey(id, full_name),
          votes:poll_votes(id, option_index, user_id)
        `)
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error

      // Compute results and user vote
      return (data as unknown as Poll[]).map((poll) => {
        const votes = (poll.votes ?? []) as PollVote[]
        const totalVotes = votes.length
        const results = (poll.options as string[]).map((opt, i) => {
          const count = votes.filter((v) => v.option_index === i).length
          return {
            option_index: i,
            option_text: opt,
            vote_count: count,
            percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0,
          }
        })
        const userVote = user
          ? votes.find((v) => v.user_id === user.id) ?? null
          : null
        return { ...poll, results, user_vote: userVote }
      })
    },
  })
}

export function useActivePoll() {
  return useQuery({
    queryKey: ['polls', 'active', 'first'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      const { data, error } = await supabase
        .from('polls')
        .select('*, votes:poll_votes(id, option_index, user_id)')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const votes = ((data as unknown as Poll).votes ?? []) as PollVote[]
      const totalVotes = votes.length
      const results = (data.options as string[]).map((opt: string, i: number) => {
        const count = votes.filter((v) => v.option_index === i).length
        return { option_index: i, option_text: opt, vote_count: count,
                 percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0 }
      })
      const userVote = user ? votes.find((v) => v.user_id === user.id) ?? null : null
      return { ...(data as unknown as Poll), results, user_vote: userVote } as Poll
    },
  })
}

export function useCreatePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (poll: {
      title: string
      description?: string
      options: string[]
      is_anonymous: boolean
      min_participation: number
      deadline: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('polls')
        .insert({ ...poll, description: poll.description ?? null, created_by: user.id, status: 'active' as PollStatus, closed_at: null })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Afstemning oprettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useVotePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('poll_votes')
        .insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex,
                  voted_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Stemme afgivet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useClosePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pollId: string) => {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', pollId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Afstemning lukket')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdatePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title, deadline }: { id: string; title: string; deadline?: string }) => {
      const { error } = await supabase
        .from('polls')
        .update({ title, ...(deadline ? { deadline } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Afstemning opdateret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
