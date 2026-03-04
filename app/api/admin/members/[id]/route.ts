import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service-role client bypasses RLS — only used server-side
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&countrycodes=dk,se,no,de`,
      { headers: { 'Accept-Language': 'da', 'User-Agent': 'HjortensOrden/1.0' } },
    )
    const results = await res.json()
    if (results.length > 0) return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch { /* ignore */ }
  return null
}

async function getCallerRole() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role as string | undefined
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await getCallerRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
  }

  const body = await req.json()
  const { email, ...profileFields } = body

  // Update auth email via admin API if provided
  if (email) {
    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(params.id, { email })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
    profileFields.email = email // keep profiles table in sync
  }

  // Geocode city when it's being set/changed
  if (profileFields.city) {
    const currentProfile = await adminSupabase.from('profiles').select('city').eq('id', params.id).single()
    const currentCity = currentProfile.data?.city
    if (profileFields.city !== currentCity || !currentProfile.data?.city) {
      const coords = await geocodeCity(profileFields.city)
      if (coords) {
        profileFields.lat = coords.lat
        profileFields.lng = coords.lng
      }
    }
  } else if (profileFields.city === '' || profileFields.city === null) {
    // City cleared — remove coordinates too
    profileFields.lat = null
    profileFields.lng = null
  }

  if (Object.keys(profileFields).length > 0) {
    const { error } = await adminSupabase.from('profiles').update(profileFields).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
