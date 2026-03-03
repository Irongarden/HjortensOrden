'use client'

import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useUpdateProfile } from '@/lib/hooks/use-members'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { RoleBadge, StatusBadge } from '@/components/ui/badge'
import { formatDate, getMembershipYears } from '@/lib/utils'
import type { Database } from '@/lib/types/supabase'
import { useEffect } from 'react'

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&countrycodes=dk,se,no,de`,
      { headers: { 'Accept-Language': 'da' } },
    )
    const results = await res.json()
    if (results.length > 0) return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch { /* ignore */ }
  return null
}

const schema = z.object({
  full_name: z.string().min(2, 'Navn er for kort'),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().max(400, 'Bio må maks være 400 tegn').optional(),
})
type FormData = z.infer<typeof schema>

export function ProfileContent() {
  const { profile, setProfile } = useAuthStore()
  const updateProfile = useUpdateProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)

  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
      bio: profile?.bio ?? '',
    },
  })

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const cacheBusted = `${publicUrl}?t=${Date.now()}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileErr } = await (supabase as any).from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    if (profileErr) { toast.error(profileErr.message); setUploading(false); return }
    setAvatarUrl(cacheBusted)
    setProfile({ ...profile, avatar_url: cacheBusted })
    toast.success('Profilbillede opdateret')
    setUploading(false)
  }, [profile, setProfile])

  // Geocode on first load if city is set but coordinates are missing
  useEffect(() => {
    if (!profile) return
    if (profile.city && profile.lat == null) {
      geocodeCity(profile.city).then((coords) => {
        if (coords) updateProfile.mutateAsync({ lat: coords.lat, lng: coords.lng })
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const onSubmit = async (data: FormData) => {
    if (!profile) return
    // Geocode if city changed
    const updates: Parameters<typeof updateProfile.mutateAsync>[0] = { ...data }
    if (data.city && data.city !== profile.city) {
      const coords = await geocodeCity(data.city)
      if (coords) { updates.lat = coords.lat; updates.lng = coords.lng }
    } else if (!data.city) {
      updates.lat = null
      updates.lng = null
    }
    await updateProfile.mutateAsync(updates)
    setProfile({ ...profile, ...updates })
  }

  if (!profile) return null

  const years = profile.joined_at ? getMembershipYears(profile.joined_at) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
      <div>
        <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Din</p>
        <h1 className="font-serif text-display-sm text-parchment">Profil</h1>
      </div>

      {/* Avatar + quick info */}
      <div className="bg-charcoal border border-border rounded-2xl p-6 flex items-start gap-6">
        <div className="relative flex-shrink-0">
          <Avatar src={avatarUrl} name={profile.full_name} size="2xl" ring />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gold flex items-center justify-center shadow-gold-sm hover:bg-gold-400 transition-colors"
          >
            <Camera size={14} className="text-obsidian" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-heading-sm text-parchment">{profile.full_name}</h2>
          <p className="text-sm text-muted mt-0.5">{profile.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <RoleBadge role={profile.role} />
            <StatusBadge status={profile.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            {profile.joined_at && (
              <>
                <div>
                  <p className="text-xs text-muted">Indmeldt</p>
                  <p className="text-parchment font-medium">{formatDate(profile.joined_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Anciennitet</p>
                  <p className="text-parchment font-medium">{years} {years === 1 ? 'år' : 'år'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-charcoal border border-border rounded-2xl p-6">
        <h3 className="font-serif text-heading-xs text-parchment mb-5">Personlige oplysninger</h3>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Fulde navn" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Telefon" type="tel" placeholder="+45 00 00 00 00" {...register('phone')} />
          <Input label="By" placeholder="København, Aarhus…" hint="Bruges til kortvisning af medlemmer" {...register('city')} />
          <div>
            <label className="block text-label-sm text-muted mb-1.5">Bio</label>
            <textarea
              rows={4}
              placeholder="Fortæl lidt om dig selv…"
              className="input-base w-full resize-none"
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-red-400 mt-1">{errors.bio.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="gold"
              disabled={!isDirty}
              loading={isSubmitting || updateProfile.isPending}
            >
              Gem ændringer
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
