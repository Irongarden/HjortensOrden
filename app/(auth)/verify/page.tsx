'use client'

import { Suspense } from 'react'
import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createBrowserClient } from '@supabase/ssr'
import toast from 'react-hot-toast'
import { RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/types/supabase'

type OtpType = 'signup' | 'invite' | 'email_change' | 'recovery'

export default function VerifyPage() {
  return <Suspense fallback={null}><VerifyPageContent /></Suspense>
}

function VerifyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const type = (searchParams.get('type') ?? 'signup') as OtpType
  const next = searchParams.get('next') ?? '/dashboard'

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const focusNext = (index: number) => inputs.current[Math.min(index + 1, 5)]?.focus()
  const focusPrev = (index: number) => inputs.current[Math.max(index - 1, 0)]?.focus()

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    setError(null)
    if (cleaned) focusNext(index)
    // Auto-submit when all 6 digits are filled
    if (next.every(Boolean) && cleaned) {
      verify(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else {
        focusPrev(index)
      }
    } else if (e.key === 'ArrowLeft') {
      focusPrev(index)
    } else if (e.key === 'ArrowRight') {
      focusNext(index)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) verify(pasted)
  }

  const verify = async (token: string) => {
    if (loading) return
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.verifyOtp({ email, token, type })

    if (err) {
      setError('Forkert eller udløbet kode. Prøv igen.')
      setDigits(Array(6).fill(''))
      inputs.current[0]?.focus()
      setLoading(false)
      return
    }

    setDone(true)
    toast.success('E-mail bekræftet!')
    setTimeout(() => router.push(next), 1000)
  }

  const handleSubmit = () => {
    const token = digits.join('')
    if (token.length < 6) { setError('Indtast alle 6 cifre'); return }
    verify(token)
  }

  const resendCode = async () => {
    setResending(true)
    const { error: err } = await supabase.auth.resend({ type: 'signup', email })
    if (err) {
      toast.error(err.message)
    } else {
      toast.success('En ny kode er sendt til din e-mail')
    }
    setResending(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-forest/20 border border-forest/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} className="text-forest-400" />
          </div>
          <h1 className="font-serif text-heading-lg text-parchment">E-mail bekræftet</h1>
          <p className="text-muted text-sm">Du omdirigeres nu…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Left panel */}
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
              &ldquo;Broderskab forpligter.<br />Traditioner forener.&rdquo;
            </p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="ornament text-gold/30 text-[10px]"><span>Est. 2010</span></div>
          <p className="text-xs text-muted/60 text-center mt-3">Et eksklusivt broderskab funderet på tradition og fællesskab</p>
        </div>
      </div>

      {/* Right OTP form */}
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

          <h1 className="font-serif text-display-sm text-parchment mb-2">Bekræft din e-mail</h1>
          <p className="text-sm text-muted mb-2">
            Vi har sendt en 6-cifret kode til:
          </p>
          <p className="text-sm font-medium text-gold mb-8 truncate">{email}</p>

          {/* 6-box OTP input */}
          <div className="flex gap-3 justify-between mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                autoFocus={i === 0}
                className={`w-12 h-14 rounded-xl border text-center text-xl font-mono font-bold bg-surface text-parchment
                  outline-none transition-all focus:ring-2 focus:ring-gold/50 focus:border-gold
                  ${error ? 'border-red-500/60 bg-red-900/10' : d ? 'border-gold/60' : 'border-border'}
                  ${done ? 'border-forest/60 bg-forest/10 text-forest-400' : ''}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 mb-4 text-center"
            >
              {error}
            </motion.p>
          )}

          <Button
            variant="gold"
            size="lg"
            className="w-full"
            loading={loading}
            onClick={handleSubmit}
            disabled={digits.filter(Boolean).length < 6}
          >
            Bekræft kode
          </Button>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted mb-2">Har du ikke modtaget en kode?</p>
            <button
              onClick={resendCode}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-400 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} className={resending ? 'animate-spin' : ''} />
              Send kode igen
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
