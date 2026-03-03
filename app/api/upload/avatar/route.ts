import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/supabase'

export async function POST(req: NextRequest) {
  // Verify caller is authenticated
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const memberId = formData.get('memberId') as string | null

  if (!file || !memberId) {
    return NextResponse.json({ error: 'Missing file or memberId' }, { status: 400 })
  }

  // Only allow uploading for yourself, unless you're an admin
  if (memberId !== user.id) {
    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: callerProfile } = await (adminClient as any)
      .from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Adgang nægtet' }, { status: 403 })
    }
  }

  const admin = createAdminClient()

  // Upload file using admin client (bypasses storage RLS)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${memberId}/avatar.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)

  // Update the profile avatar_url via REST (bypasses TS type narrowing on update)
  const patchRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${memberId}`,
    {
      method: 'PATCH',
      headers: {
        apikey:          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization:   `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type':  'application/json',
        Prefer:          'return=minimal',
      },
      body: JSON.stringify({ avatar_url: publicUrl }),
    },
  )
  if (!patchRes.ok) {
    const msg = await patchRes.text()
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ publicUrl })
}
