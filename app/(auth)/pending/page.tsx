'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
        className="text-center max-w-sm w-full"
      >
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl overflow-hidden">
            <img src="/HOLogo.png" alt="Hjortens Orden" className="w-full h-full object-contain" />
          </div>
          <p className="font-serif text-parchment text-lg font-semibold">Hjortens Orden</p>
        </div>

        <div className="w-20 h-20 rounded-full bg-amber-900/20 border border-amber-700/30 flex items-center justify-center mx-auto mb-6">
          <Clock size={36} className="text-amber-400" />
        </div>

        <h1 className="font-serif text-display-sm text-parchment mb-3">
          Afventer godkendelse
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-2">
          Din ansøgning er modtaget og er til behandling.
        </p>
        <p className="text-muted text-sm leading-relaxed mb-8">
          En administrator eller ordensformand vil gennemgå din ansøgning og give dig adgang, når du er godkendt.
        </p>

        <div className="p-4 bg-amber-900/10 border border-amber-700/20 rounded-xl mb-8">
          <p className="text-xs text-amber-400/80">
            Du vil kunne logge ind og tilgå systemet, så snart din ansøgning er godkendt.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted hover:text-parchment"
        >
          Log ud
        </Button>
      </motion.div>
    </div>
  )
}
