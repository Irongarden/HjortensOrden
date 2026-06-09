import { createClient } from '@/lib/supabase/server'
import { hasMinRole as hasMinRoleRbac } from '@/lib/rbac'
import type { MemberRole } from '@/lib/types'

export type CallerContext = {
  userId: string
  role: MemberRole | null
}

export async function getCallerContext(): Promise<CallerContext | null> {
  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  return {
    userId: user.id,
    role: (profile?.role as MemberRole | undefined) ?? null,
  }
}

export function hasMinRole(
  role: MemberRole | null | undefined,
  minRole: MemberRole,
): boolean {
  if (!role) return false
  return hasMinRoleRbac(role, minRole)
}