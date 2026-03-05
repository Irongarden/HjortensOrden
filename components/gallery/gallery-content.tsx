'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Images, Pencil, Trash2, X, Calendar } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthReady } from '@/lib/hooks/use-auth-ready'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AlbumView } from './album-view'
import { UploadModal } from './upload-modal'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/types/supabase'
import type { GalleryAlbum } from '@/lib/types'

function useAlbums() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['gallery-albums'],
    queryFn: async () => {
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ) as unknown as SupabaseClient<Database>
      const { data, error } = await supabase
        .from('gallery_albums')
        .select('*, gallery_images(count), event:events(id, title)')
        .order('event_date', { ascending: false })
      if (error) throw error
      return data as unknown as (GalleryAlbum & { gallery_images: { count: number }[] })[]
    },
    staleTime: 60_000,
    enabled: authReady,
  })
}

function useDeleteAlbum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const db = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ) as unknown as SupabaseClient<Database>
      // Fetch image storage paths so we can clean up storage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: imgs } = await (db as any).from('gallery_images').select('storage_path').eq('album_id', id)
      if (imgs?.length) {
        await db.storage.from('gallery').remove(imgs.map((i: { storage_path: string }) => i.storage_path))
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from('gallery_albums').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-albums'] }); toast.success('Album slettet') },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useUpdateAlbum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GalleryAlbum> & { id: string }) => {
      const db = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ) as unknown as SupabaseClient<Database>
      const { error } = await db.from('gallery_albums').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-albums'] }); toast.success('Album opdateret') },
    onError: () => toast.error('Kunne ikke opdatere album'),
  })
}

function useEventsForPicker() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['events-picker'],
    queryFn: async () => {
      const db = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ) as unknown as SupabaseClient<Database>
      const { data, error } = await db
        .from('events')
        .select('id, title, starts_at')
        .order('starts_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as { id: string; title: string; starts_at: string }[]
    },
    staleTime: 120_000,
    enabled: authReady,
  })
}

function EditAlbumModal({ album, onClose }: { album: GalleryAlbum; onClose: () => void }) {
  const updateAlbum = useUpdateAlbum()
  const { data: events = [] } = useEventsForPicker()
  const [title, setTitle] = useState(album.title)
  const [eventDate, setEventDate] = useState(album.event_date?.slice(0, 10) ?? '')
  const [eventId, setEventId] = useState(album.event_id ?? '')

  const handleSave = async () => {
    await updateAlbum.mutateAsync({ id: album.id, title: title.trim() || album.title, event_date: eventDate || null, event_id: eventId || null })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-charcoal border border-border rounded-2xl p-6 w-full max-w-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-heading-sm text-parchment">Rediger album</h2>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-parchment"><X size={18} /></button>
        </div>
        <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Dato for begivenhed" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <div>
          <label className="block text-label-sm text-muted mb-1.5">Knyt til arrangement (valgfri)</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-parchment focus:border-gold/50 focus:outline-none"
          >
            <option value="">Ingen</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({new Date(ev.starts_at).toLocaleDateString('da-DK', { year: 'numeric', month: 'short' })})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuller</Button>
          <Button variant="gold" className="flex-1" loading={updateAlbum.isPending} onClick={handleSave}>Gem</Button>
        </div>
      </motion.div>
    </div>
  )
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { duration: 0.35 } } }

export function GalleryContent() {
  const { can, profile } = useAuthStore()
  const { data: albums = [], isLoading } = useAlbums()
  const deleteAlbum = useDeleteAlbum()
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null)
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canManage = (album: GalleryAlbum) =>
    can('manage_albums') || album.created_by === profile?.id

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Galleri</h1>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-charcoal border border-border rounded-xl overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Galleri</h1>
        </div>
        {can('upload_gallery') && (
          <Button variant="gold" size="sm" onClick={() => setUploadOpen(true)}>
            <Plus size={16} /> Nyt album
          </Button>
        )}
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <Images size={40} className="mx-auto mb-4 opacity-20" />
          <p className="font-serif text-parchment/50 text-heading-sm">Galleriet er tomt</p>
          {can('upload_gallery') && <p className="text-sm mt-2">Opret det første album herover.</p>}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const count = album.gallery_images?.[0]?.count ?? 0
            return (
              <motion.div
                key={album.id}
                variants={item}
                className="group relative text-left rounded-xl overflow-hidden border border-border hover:border-gold/30 transition-all hover:shadow-card cursor-pointer"
                onClick={() => setSelectedAlbum(album)}
              >
                {/* Cover */}
                <div className="aspect-video bg-surface overflow-hidden relative">
                  {album.cover_image_url ? (
                    <img
                      src={album.cover_image_url}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images size={32} className="text-muted/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 text-xs text-parchment/80 font-mono">
                    {count} {count === 1 ? 'billede' : 'billeder'}
                  </div>
                  {/* Admin actions */}
                  {canManage(album) && (
                    <div
                      className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="p-1.5 rounded-lg bg-obsidian/80 text-parchment/70 hover:text-gold transition-colors backdrop-blur-sm"
                        title="Rediger album"
                        onClick={() => setEditingAlbum(album)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg bg-obsidian/80 text-parchment/70 hover:text-red-400 transition-colors backdrop-blur-sm"
                        title="Slet album"
                        onClick={() => {
                          if (confirm(`Slet "${album.title}"? Dette kan ikke fortrydes.`)) {
                            deleteAlbum.mutate(album.id)
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4 bg-charcoal">
                  <h3 className="font-serif text-heading-xs text-parchment group-hover:text-gold transition-colors">
                    {album.title}
                  </h3>
                  {album.event_date && (
                    <p className="text-xs text-muted mt-0.5">{formatDate(album.event_date)}</p>
                  )}
                  {(album as GalleryAlbum & { event?: { title: string } | null }).event?.title && (
                    <p className="text-xs text-gold/70 mt-0.5 flex items-center gap-1 truncate">
                      <Calendar size={9} className="flex-shrink-0" />
                      {(album as GalleryAlbum & { event?: { title: string } | null }).event!.title}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {selectedAlbum && (
        <AlbumView album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
      {editingAlbum && (
        <EditAlbumModal album={editingAlbum} onClose={() => setEditingAlbum(null)} />
      )}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </motion.div>
  )
}
