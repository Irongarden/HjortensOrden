'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuthReady } from '@/lib/hooks/use-auth-ready'
import toast from 'react-hot-toast'
import { UploadCloud, X, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { Database } from '@/lib/types/supabase'

const schema = z.object({
  title: z.string().min(2, 'Titel er for kort'),
  event_date: z.string().optional(),
  description: z.string().optional(),
  event_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface UploadModalProps {
  open: boolean
  onClose: () => void
}

function useEventsForPicker() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['events-picker'],
    queryFn: async () => {
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ) as unknown as SupabaseClient<Database>
      const { data, error } = await supabase
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

export function UploadModal({ open, onClose }: UploadModalProps) {
  const qc = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const { data: events = [] } = useEventsForPicker()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 10_000_000,
  })

  const onSubmit = async (data: FormData) => {
    if (files.length === 0) {
      toast.error('Tilføj mindst ét billede')
      return
    }
    setUploading(true)

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Ikke logget ind')

      // Create album
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: album, error: albumErr } = await db
        .from('gallery_albums')
        .insert({ title: data.title, event_date: data.event_date || null, description: data.description || null, created_by: user.id, event_id: data.event_id || null })
        .select()
        .single()
      if (albumErr) throw albumErr

      // Upload each image to storage, tracking paths
      const uploads: { url: string; path: string }[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${album.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: storageErr } = await supabase.storage.from('gallery').upload(path, file)
        if (storageErr) throw storageErr
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
        uploads.push({ url: publicUrl, path })
      }

      // Insert image records with required storage_path + uploaded_by
      await db.from('gallery_images').insert(
        uploads.map(({ url, path }) => ({ album_id: album.id, url, storage_path: path, uploaded_by: user.id })),
      )

      // Set first image as album cover
      await db.from('gallery_albums').update({ cover_image_url: uploads[0].url }).eq('id', album.id)

      qc.invalidateQueries({ queryKey: ['gallery-albums'] })
      toast.success(`Album "${data.title}" oprettet med ${uploads.length} billede${uploads.length > 1 ? 'r' : ''}`)
      reset()
      setFiles([])
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nyt album"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button variant="gold" loading={uploading} onClick={handleSubmit(onSubmit)}>
            Opret album
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="Albumtitel" placeholder="Skovturen 2024" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dato (valgfri)" type="date" {...register('event_date')} />
          <div>
            <label className="block text-label-sm text-muted mb-1.5">Knyt til arrangement</label>
            <select
              {...register('event_id')}
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
        </div>
        <Input label="Beskrivelse (valgfri)" placeholder="En kort beskrivelse…" {...register('description')} />

        {/* Dropzone */}
        <div>
          <label className="block text-label-sm text-muted mb-1.5">Billeder</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-gold bg-gold/5' : 'border-border hover:border-border/80 hover:bg-surface/50'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud size={28} className={`mx-auto mb-3 ${isDragActive ? 'text-gold' : 'text-muted'}`} />
            <p className="text-sm text-parchment/70">
              {isDragActive ? 'Slip billederne her' : 'Træk billeder hertil, eller klik for at vælge'}
            </p>
            <p className="text-xs text-muted mt-1">Maks. 10 MB pr. billede</p>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface rounded-lg px-3 py-2">
                <Image size={14} className="text-muted flex-shrink-0" />
                <span className="text-xs text-parchment/80 flex-1 truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  <X size={13} className="text-muted hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  )
}
