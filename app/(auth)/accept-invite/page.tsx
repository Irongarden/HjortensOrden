'use client'

import { Suspense } from 'react'
import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/types/supabase'

const passwordSchema = z.object({
  password: z.string().min(8, 'Adgangskode skal være mindst 8 tegn'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Adgangskoderne matcher ikke',
  path: ['confirm'],
})
type PasswordForm = z.infer<typeof passwordSchema>

type Step = 'otp' | 'password' | 'done'

export default function AcceptInvitePage() {
  return <Suspense fallback={null}><AcceptInvitePageContent /></Suspense>
}

function AcceptInvitePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''

  const [step, setStep] = useState<Step>('otp')
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [resending, setResending] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const focusNext = (i: number) => inputs.current[Math.min(i + 1, 5)]?.focus()
  const focusPrev = (i: number) => inputs.current[Math.max(i - 1, 0)]?.focus()

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    setOtpError(null)
    if (cleaned) focusNext(index)
    if (next.every(Boolean) && cleaned) verifyOtp(next.join(''))
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) { const n = [...digits]; n[index] = ''; setDigits(n) }
      else focusPrev(index)
    } else if (e.key === 'ArrowLeft') focusPrev(index)
    else if (e.key === 'ArrowRight') focusNext(index)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) verifyOtp(pasted)
  }

  const verifyOtp = async (token: string) => {
    if (verifying) return
    setVerifying(true)
    setOtpError(null)

    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'invite' })

    if (error) {
      setOtpError('Forkert eller udløbet kode. Prøv igen.')
      setDigits(Array(6).fill(''))
      inputs.current[0]?.focus()
      setVerifying(false)
      return
    }

    setVerifying(false)
    setStep('password')
  }

  const resendInvite = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) toast.error(error.message)
    else toast.success('En ny kode er sendt')
    setResending(false)
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { toast.error(error.message); return }
    setStep('done')
    setTimeout(() => router.push('/dashboard'), 1500)
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
              &ldquo;Broderskab forpligter.<br />Traditioner forener.&rdquo;
            </p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="ornament text-gold/30 text-[10px]"><span>Est. 2010</span></div>
          <p className="text-xs text-muted/60 text-center mt-3">Et eksklusivt broderskab funderet på tradition og fællesskab</p>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img src="/HOLogo.png" alt="Hjortens Orden" className="w-full h-full object-contain" />
            </div>
            <p className="font-serif text-parchment text-lg font-semibold">Hjortens Orden</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>
                <h1 className="font-serif text-display-sm text-parchment mb-2">Du er inviteret</h1>
                <p className="text-sm text-muted mb-2">Indtast den 6-cifrede kode sendt til:</p>
                <p className="text-sm font-medium text-gold mb-8 truncate">{email}</p>

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
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={(e) => e.target.select()}
                      autoFocus={i === 0}
                      className={`w-12 h-14 rounded-xl border text-center text-xl font-mono font-bold bg-surface text-parchment
                        outline-none transition-all focus:ring-2 focus:ring-gold/50 focus:border-gold
                        ${otpError ? 'border-red-500/60 bg-red-900/10' : d ? 'border-gold/60' : 'border-border'}`}
                    />
                  ))}
                </div>

                {otpError && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 mb-4 text-center">
                    {otpError}
                  </motion.p>
                )}

                <Button variant="gold" size="lg" className="w-full" loading={verifying} onClick={() => verifyOtp(digits.join(''))} disabled={digits.filter(Boolean).length < 6}>
                  Bekræft kode
                </Button>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted mb-2">Har du ikke modtaget en kode?</p>
                  <button onClick={resendInvite} disabled={resending} className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-400 transition-colors disabled:opacity-50">
                    <RotateCcw size={12} className={resending ? 'animate-spin' : ''} />
                    Send kode igen
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>
                <h1 className="font-serif text-display-sm text-parchment mb-2">Vælg adgangskode</h1>
                <p className="text-sm text-muted mb-8">Koden er bekræftet. Opret nu din adgangskode.</p>
                <form className="space-y-4" onSubmit={handleSubmit(onPasswordSubmit)}>
                  <Input
                    label="Adgangskode"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    error={errors.password?.message}
                    rightIcon={
                      <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted hover:text-parchment transition-colors">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    {...register('password')}
                  />
                  <Input label="Bekræft adgangskode" type={showPw ? 'text' : 'password'} autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
                  <Button type="submit" variant="gold" size="lg" className="w-full mt-2" loading={isSubmitting}>Aktivér konto</Button>
                </form>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-forest/20 border border-forest/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} className="text-forest-400" />
                </div>
                <h1 className="font-serif text-heading-lg text-parchment">Velkommen til ordenen</h1>
                <p className="text-muted text-sm">Du omdirigeres til dashboardet…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

