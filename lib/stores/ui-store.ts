'use client'

import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  commandOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setCommandOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandOpen: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCommandOpen: (open) => set({ commandOpen: open }),
}))
