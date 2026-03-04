'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [linkStatus, setLinkStatus] = useState<'checking' | 'valid' | 'expired' | 'invalid'>('checking')

  // Validate the invite link on mount
  useEffect(() => {
    if (!token) { setLinkStatus('invalid'); return }
    fetch(`/api/invite-links/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.expired) setLinkStatus('expired')
        else if (json.valid) setLinkStatus('valid')
        else setLinkStatus('invalid')
      })
      .catch(() => setLinkStatus('invalid'))
  }, [token])

  if (linkStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-obsidian p-8 text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted text-sm">Validerer invitationslink…</p>
      </div>
    )
  }

  if (linkStatus === 'expired') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-obsidian p-8 text-center">
        <Clock size={48} className="text-amber-400 mb-4" />
        <h1 className="font-serif text-display-sm text-parchment mb-2">Invitationen er udløbet</h1>
        <p className="text-muted text-sm max-w-sm">
          Dette invitationslink er ikke længere gyldigt. Kontakt en administrator for at få et nyt link.
        </p>
      </div>
    )
  }

  if (linkStatus === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-obsidian p-8 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h1 className="font-serif text-display-sm text-parchment mb-2">Ugyldigt link</h1>
        <p className="text-muted text-sm">Dette invitationslink er ugyldigt, inaktivt eller har nået sit maksimale antal anvendelser.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/invite/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, email, password, city: city || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Der opstod en fejl')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Netværksfejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-dark p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial from-forest-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 rounded-xl overflow-hidden">
              <img src="/HOLogo.png" alt="Hjortens Orden" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-serif text-parchment text-lg font-semibold">Hjortens Orden</p>
              <p className="text-xs text-muted uppercase tracking-widest">Broderskabet</p>
            </div>
          </div>

          <div className="border-l-2 border-gold/30 pl-6">
            <p className="font-serif text-2xl text-parchment/90 italic leading-relaxed">
              &ldquo;Et broderskab
              <br />begynder med ét skridt.&rdquo;
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-muted/60 text-center">
            Du er blevet inviteret til at ansøge om medlemskab
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img src="/HOLogo.png" alt="Hjortens Orden" className="w-full h-full object-contain" />
            </div>
            <p className="font-serif text-parchment text-lg font-semibold">Hjortens Orden</p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <CheckCircle size={56} className="mx-auto text-green-400" />
              <h1 className="font-serif text-display-sm text-parchment">Ansøgning modtaget!</h1>
              <p className="text-sm text-muted">
                Din ansøgning er sendt. Du omdirigeres til login om et øjeblik, og vil få adgang når en administrator godkender dig.
              </p>
            </motion.div>
          ) : (
            <>
              <h1 className="font-serif text-display-sm text-parchment mb-2">Ansøg om medlemskab</h1>
              <p className="text-sm text-muted mb-8">
                Udfyld formularen for at ansøge. En administrator vil gennemgå din ansøgning.
              </p>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/40 rounded-lg text-red-300 text-sm mb-6">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Fulde navn"
                  type="text"
                  placeholder="Dit navn"
                  leftIcon={<User size={16} />}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  label="E-mailadresse"
                  type="email"
                  placeholder="dit@navn.dk"
                  leftIcon={<Mail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="By"
                  type="text"
                  placeholder="København, Aarhus…"
                  leftIcon={<MapPin size={16} />}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="Adgangskode"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted hover:text-parchment transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  loading={loading}
                  className="w-full mt-6"
                >
                  Send ansøgning
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <p className="text-xs text-muted/60">
                  Har du allerede en konto?{' '}
                  <a href="/login" className="text-gold hover:underline">
                    Log ind
                  </a>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
      <JoinForm />
    </Suspense>
  )
}
