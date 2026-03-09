'use client'

import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { compressImage } from '@/lib/utils'

const supabase = createClient()
import { ImagePlus, Link, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { TimelineEntry } from '@/lib/types'

const schema = z.object({
  title:       z.string().min(3, 'Titel er for kort'),
  description: z.string().optional(),
  entry_date:  z.string().min(1, 'Vælg en dato'),
  type:        z.enum(['founding', 'chairman_transition', 'major_event', 'milestone', 'anniversary', 'other']),
  image_url:   z.string().url('Ugyldig URL').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

interface TimelineEntryModalProps {
  open: boolean
  entry?: TimelineEntry
  onClose: () => void
}

export function TimelineEntryModal({ open, entry, onClose }: TimelineEntryModalProps) {
  const qc = useQueryClient()
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? {
          title:       entry.title,
          description: entry.description ?? '',
          entry_date:  entry.entry_date.slice(0, 10),
          type:        entry.type as FormData['type'],
          image_url:   entry.image_url ?? '',
        }
      : { type: 'major_event' },
  })

  // Re-populate form when entry changes (modal stays mounted)
  useEffect(() => {
    if (entry) {
      reset({
        title:       entry.title,
        description: entry.description ?? '',
        entry_date:  entry.entry_date.slice(0, 10),
        type:        entry.type as FormData['type'],
        image_url:   entry.image_url ?? '',
      })
    } else {
      reset({ type: 'major_event', title: '', description: '', entry_date: '', image_url: '' })
    }
  }, [entry, reset])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadPreview(URL.createObjectURL(file))
  }

  const upsert = useMutation({
    mutationFn: async (data: FormData) => {
      let finalImageUrl = data.image_url || null

      // Upload file to storage if provided
      if (imageTab === 'upload' && uploadFile) {
        const compressed = await compressImage(uploadFile, { maxPx: 2000, quality: 0.85 })
        const path = `timeline/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('gallery')
          .upload(path, compressed, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
        finalImageUrl = publicUrl
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Ikke logget ind')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      if (entry) {
        const { error } = await db.from('timeline_entries').update({
          title:       data.title,
          description: data.description || null,
          entry_date:  data.entry_date,
          type:        data.type,
          image_url:   finalImageUrl,
          images:      finalImageUrl ? [finalImageUrl] : (entry?.images ?? null),
        }).eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await db.from('timeline_entries').insert({
          title:       data.title,
          description: data.description || null,
          entry_date:  data.entry_date,
          type:        data.type,
          image_url:   finalImageUrl,
          images:      finalImageUrl ? [finalImageUrl] : null,
          created_by:  user.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success(entry ? 'Kapitel opdateret' : 'Kapitel tilføjet')
      reset()
      setUploadFile(null)
      setUploadPreview(null)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Rediger kapitel' : 'Nyt kapitel'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button variant="gold" loading={isSubmitting || upsert.isPending} onClick={handleSubmit((d) => upsert.mutate(d))}>
            {entry ? 'Gem' : 'Opret'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Titel"
          placeholder="Et bemærkelsesværdigt kapitel…"
          error={errors.title?.message}
          {...register('title')}
        />
        <div>
          <label className="block text-label-sm text-muted mb-1.5">Indhold</label>
          <textarea
            rows={4}
            placeholder="Beskriv dette kapitel i ordenens historie…"
            className="input-base w-full resize-none"
            {...register('description')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dato" type="date" error={errors.entry_date?.message} {...register('entry_date')} />
          <Select
            label="Type"
            options={[
              { value: 'major_event',        label: 'Begivenhed' },
              { value: 'milestone',           label: 'Milepæl' },
              { value: 'founding',            label: 'Grundlæggelse' },
              { value: 'chairman_transition', label: 'Lederskifte' },
              { value: 'anniversary',         label: 'Jubilæum' },
              { value: 'other',               label: 'Andet' },
            ]}
            {...register('type')}
          />
        </div>

        {/* Image section */}
        <div>
          <label className="block text-label-sm text-muted mb-2">Billede (valgfri)</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setImageTab('url')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                imageTab === 'url'
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-border text-muted hover:border-border/80'
              }`}
            >
              <Link size={12} /> URL
            </button>
            <button
              type="button"
              onClick={() => setImageTab('upload')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                imageTab === 'upload'
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-border text-muted hover:border-border/80'
              }`}
            >
              <Upload size={12} /> Upload fra enhed
            </button>
          </div>

          {imageTab === 'url' ? (
            <Input
              placeholder="https://…"
              error={errors.image_url?.message}
              {...register('image_url')}
            />
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadPreview ? (
                <div className="relative rounded-lg overflow-hidden aspect-video bg-surface">
                  <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setUploadFile(null); setUploadPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-obsidian/80 border border-border flex items-center justify-center text-muted hover:text-parchment transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted hover:border-gold/30 hover:text-parchment/60 transition-colors"
                >
                  <ImagePlus size={24} />
                  <span className="text-xs">Klik for at vælge billede</span>
                  <span className="text-[10px] opacity-60">JPG, PNG, WEBP op til 50 MB · Komprimeres automatisk</span>
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
