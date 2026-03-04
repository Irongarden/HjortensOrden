'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Event, EventParticipant, RSVPStatus } from '@/lib/types'
import toast from 'react-hot-toast'

const supabase = createClient()

export function useEvents(month?: string) {
  return useQuery({
    queryKey: ['events', month],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey(id, full_name, avatar_url),
          participants:event_participants(
            id, user_id, rsvp, responded_at,
            profile:profiles(id, full_name, avatar_url)
          )
        `)
        .neq('status', 'draft')
        .order('starts_at')

      if (month) {
        const start = `${month}-01`
        const end = `${month}-31`
        query = query.gte('starts_at', start).lte('starts_at', end)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as Event[]
    },
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey(id, full_name, avatar_url),
          participants:event_participants(
            id, user_id, rsvp, responded_at,
            profile:profiles(id, full_name, avatar_url)
          ),
          expenses:event_expenses(*, registrar:profiles(id, full_name)),
          album:gallery_albums(id, title, cover_image_url, image_count:gallery_images(count))
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as Event
    },
    enabled: !!id,
  })
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ['events', 'upcoming', limit],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants:event_participants(id, user_id, rsvp, responded_at, profile:profiles(id, full_name, avatar_url))')
        .gte('starts_at', new Date().toISOString())
        .eq('status', 'published')
        .order('starts_at')
        .limit(limit)
      if (error) throw error
      return data as unknown as Event[]
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title!,
          description: event.description ?? null,
          location: event.location ?? null,
          starts_at: event.starts_at!,
          ends_at: event.ends_at!,
          is_recurring: event.is_recurring ?? false,
          recurrence_rule: event.recurrence_rule ?? null,
          status: event.status ?? 'draft',
          budget_dkk: event.budget_dkk ?? null,
          cover_image_url: event.cover_image_url ?? null,
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('Begivenhed oprettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { title, description, location, starts_at, ends_at, is_recurring,
              recurrence_rule, status, budget_dkk, cover_image_url } = updates
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, location, starts_at, ends_at, is_recurring,
                              recurrence_rule, status, budget_dkk, cover_image_url }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl ved opdatering') }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('Begivenhed opdateret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Fejl ved sletning') }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('Begivenhed slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRSVP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, rsvp }: { eventId: string; rsvp: RSVPStatus }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('event_participants')
        .upsert(
          { event_id: eventId, user_id: user.id, rsvp, responded_at: new Date().toISOString() },
          { onConflict: 'event_id,user_id' }
        )
      if (error) throw error
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['events', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('RSVP registreret')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
