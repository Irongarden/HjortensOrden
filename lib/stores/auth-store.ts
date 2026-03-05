'use client'

import { create } from 'zustand'
import { Profile, MemberRole } from '@/lib/types'
import { Permission } from '@/lib/rbac'
import { can } from '@/lib/rbac'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  isBootstrapped: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  can: (permission: Permission) => boolean
  hasRole: (role: MemberRole) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isBootstrapped: false,
  // Start as false — AppShell sets the actual profile via useLayoutEffect before
  // the first browser paint. Keeping this false means all React Query hooks are
  // enabled from the very first render and use HydrationBoundary cache data
  // immediately, with no "isLoading dance" that can race against token refresh.
  isLoading: false,

  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  can: (permission) => {
    const { profile } = get()
    if (!profile) return false
    return can(profile.role as MemberRole, permission)
  },

  hasRole: (role) => {
    const { profile } = get()
    return profile?.role === role
  },
}))
