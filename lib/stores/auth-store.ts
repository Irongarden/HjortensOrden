'use client'

import { create } from 'zustand'
import { Profile, MemberRole } from '@/lib/types'
import { Permission } from '@/lib/rbac'
import { can } from '@/lib/rbac'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  can: (permission: Permission) => boolean
  hasRole: (role: MemberRole) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,

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
