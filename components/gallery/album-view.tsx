'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Upload, UploadCloud, Loader2 } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Download from 'yet-another-react-lightbox/plugins/download'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthReady } from '@/lib/hooks/use-auth-ready'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { compressImage } from '@/lib/utils'
import type { Database } from '@/lib/types/supabase'
import type { GalleryAlbum, GalleryImage } from '@/lib/types'

const supabase = createClient() as unknown as SupabaseClient<Database>
function createDB() { return supabase }

function useAlbumImages(albumId: string) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['gallery-images', albumId],
    queryFn: async () => {
      const supabase = createDB()
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*, uploader:profiles!uploaded_by(full_name)')
        .eq('album_id', albumId)
        .order('uploaded_at', { ascending: true })
      if (error) throw error
      return data as unknown as GalleryImage[]
    },
    staleTime: 60_000,
    enabled: authReady && !!albumId,
  })
}

function useDeleteImage(albumId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ imageId, storagePath }: { imageId: string; storagePath: string }) => {
      const supabase = createDB()
      // Best-effort storage cleanup
      await supabase.storage.from('gallery').remove([storagePath])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('gallery_images').delete().eq('id', imageId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery-images', albumId] })
      qc.invalidateQueries({ queryKey: ['gallery-albums'] })
      toast.success('Billede slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useUploadImages(albumId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const supabase = createDB()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Ikke logget ind')

      const firstImages = await (supabase as unknown as SupabaseClient<Database>)
        .from('gallery_images' as never)
        .select('id')
        .eq('album_id' as never, albumId)
        .limit(1) as { data: unknown[] | null }
      const isFirstUpload = !firstImages.data?.length

      let firstUrl: string | null = null
      for (const file of files) {
        const compressed = await compressImage(file, { maxPx: 2000, quality: 0.85 })
        const path = `${albumId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: storageErr } = await supabase.storage.from('gallery').upload(path, compressed)
        if (storageErr) throw storageErr
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('gallery_images').insert({
          album_id: albumId, url: publicUrl, storage_path: path, uploaded_by: user.id,
        })
        if (!firstUrl) firstUrl = publicUrl
      }

      // Set album cover if this was the first upload
      if (isFirstUpload && firstUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('gallery_albums').update({ cover_image_url: firstUrl }).eq('id', albumId)
      }
    },
    onSuccess: (_, files) => {
      qc.invalidateQueries({ queryKey: ['gallery-images', albumId] })
      qc.invalidateQueries({ queryKey: ['gallery-albums'] })
      toast.success(`${files.length} billede${files.length !== 1 ? 'r' : ''} tilføjet`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

interface AlbumViewProps {
  album: GalleryAlbum
  onClose: () => void
}

export function AlbumView({ album, onClose }: AlbumViewProps) {
  const { data: images = [], isLoading } = useAlbumImages(album.id)
  const { profile, can } = useAuthStore()
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const [showUpload, setShowUpload] = useState(false)

  const deleteImage  = useDeleteImage(album.id)
  const uploadImages = useUploadImages(album.id)

  const canUpload    = can('upload_images')
  const canDeleteAny = can('delete_any_image')

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return
    uploadImages.mutate(accepted, { onSuccess: () => setShowUpload(false) })
  }, [uploadImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 50_000_000,
    disabled: uploadImages.isPending,
  })

  const slides = images.map((img) => ({
    src: img.url,
    alt: img.caption ?? '',
    download: {
      url: img.url,
      filename: img.caption
        ? `${img.caption.replace(/[^a-z0-9æøå]/gi, '_')}.jpg`
        : `billede-${img.id}.jpg`,
    },
  }))

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="font-serif text-heading-sm text-parchment">{album.title}</h2>
          <p className="text-xs text-muted">{images.length} {images.length === 1 ? 'billede' : 'billeder'}</p>
        </div>
        <div className="flex items-center gap-2">
          {canUpload && (
            <Button
              size="sm"
              variant={showUpload ? 'gold' : 'outline'}
              onClick={() => setShowUpload((v) => !v)}
            >
              <Upload size={14} /> Tilføj billeder
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface text-muted hover:text-parchment transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Upload zone — collapsible */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border flex-shrink-0"
          >
            <div className="p-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-gold bg-gold/5'
                    : 'border-border hover:border-gold/40 hover:bg-surface/30'
                }`}
              >
                <input {...getInputProps()} />
                {uploadImages.isPending ? (
                  <div className="flex items-center justify-center gap-2 text-gold">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-sm">Uploader…</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={24} className={`mx-auto mb-2 ${isDragActive ? 'text-gold' : 'text-muted'}`} />
                    <p className="text-sm text-parchment/70">
                      {isDragActive ? 'Slip billederne her' : 'Træk billeder hertil, eller klik for at vælge'}
                    </p>
                    <p className="text-xs text-muted mt-1">Maks. 50 MB pr. billede · Komprimeres automatisk · Flere billeder tilladt</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <PageLoader />
        ) : images.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-parchment/50 text-heading-sm">Albummet er tomt</p>
            {canUpload && (
              <button
                className="text-sm text-gold hover:text-gold/80 mt-3 transition-colors"
                onClick={() => setShowUpload(true)}
              >
                Tilføj det første billede →
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
          >
            {images.map((img, idx) => {
              const isOwn = img.uploaded_by === profile?.id
              const canDelete = canDeleteAny || isOwn
              const isDeleting = deleteImage.isPending && deleteImage.variables?.imageId === img.id

              return (
                <motion.div
                  key={img.id}
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
                  className="aspect-square rounded-lg overflow-hidden group relative border border-border hover:border-gold/30 transition-all"
                >
                  {/* Image — clickable for lightbox */}
                  <button className="w-full h-full block" onClick={() => setLightboxIndex(idx)}>
                    <img
                      src={img.url}
                      alt={img.caption ?? ''}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </button>

                  {/* Delete button — top-right corner, doesn't block image clicks */}
                  {canDelete && (
                    <button
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Slet dette billede? Dette kan ikke fortrydes.')) {
                          deleteImage.mutate({ imageId: img.id, storagePath: img.storage_path })
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-obsidian/80 hover:bg-red-900/90 text-muted hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      title="Slet billede"
                    >
                      {isDeleting
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Download, Zoom]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        styles={{ container: { backgroundColor: 'rgba(15,17,21,0.97)' } }}
      />
    </div>
  )
}

