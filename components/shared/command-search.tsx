'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'event' | 'member' | 'timeline'
  id: string
  title: string
  snippet: string
  url: string
}

export function CommandSearch() {
  const { commandOpen, setCommandOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await supabase.rpc('search_all', { query })
        setResults((data as SearchResult[]) ?? [])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, supabase])

  const navigate = useCallback((url: string) => {
    router.push(url)
    setCommandOpen(false)
    setQuery('')
  }, [router, setCommandOpen])

  const typeLabels = { event: 'Begivenhed', member: 'Medlem', timeline: 'Tidslinje' }
  const typeColors = {
    event: 'text-forest-400 bg-forest/10',
    member: 'text-gold bg-gold/10',
    timeline: 'text-blue-400 bg-blue-900/20',
  }

  return (
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setCommandOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
            className="relative w-full max-w-xl bg-charcoal border border-border rounded-2xl
                       shadow-modal overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
              <Search size={20} className="text-muted flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg i begivenheder, medlemmer og arkiv…"
                className="flex-1 bg-transparent text-parchment placeholder:text-muted/50
                           focus:outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCommandOpen(false)
                }}
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
              )}
              <button onClick={() => setCommandOpen(false)} className="text-muted hover:text-parchment">
                <X size={18} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && query.length >= 2 && !loading && (
                <div className="text-center py-10 text-muted text-sm">
                  Ingen resultater for &ldquo;{query}&rdquo;
                </div>
              )}
              {results.length === 0 && query.length < 2 && (
                <div className="text-center py-10 text-muted text-sm">
                  Start med at skrive for at søge…
                </div>
              )}
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigate(result.url)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface/50
                             transition-colors border-b border-border/50 last:border-0 text-left"
                >
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded',
                    'flex-shrink-0 mt-0.5',
                    typeColors[result.type]
                  )}>
                    {typeLabels[result.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-parchment truncate">{result.title}</p>
                    {result.snippet && (
                      <p className="text-xs text-muted mt-0.5 truncate">{result.snippet}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-[11px] text-muted/60">
              <span><kbd className="border border-border rounded px-1 py-0.5">↑↓</kbd> Naviger</span>
              <span><kbd className="border border-border rounded px-1 py-0.5">↵</kbd> Åbn</span>
              <span><kbd className="border border-border rounded px-1 py-0.5">Esc</kbd> Luk</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
