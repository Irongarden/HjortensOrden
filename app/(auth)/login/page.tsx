'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email:    z.string().email('Ugyldig e-mailadresse'),
  password: z.string().min(6, 'Adgangskode skal være mindst 6 tegn'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const sendOtp = async () => {
    if (!otpEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(otpEmail)) {
      setOtpError('Indtast en gyldig e-mailadresse')
      return
    }
    setOtpLoading(true)
    setOtpError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: otpEmail,
      options: { shouldCreateUser: false },
    })
    setOtpLoading(false)
    if (error) { setOtpError('Kunne ikke sende kode. Er e-mailen registreret?'); return }
    setOtpStep('verify')
    toast.success('Kode sendt til ' + otpEmail)
  }

  const verifyOtp = async () => {
    if (otpCode.length < 6) { setOtpError('Indtast den 6-cifrede kode'); return }
    setOtpLoading(true)
    setOtpError(null)
    const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: 'email' })
    setOtpLoading(false)
    if (error) { setOtpError('Forkert eller udløbet kode — prøv igen'); return }
    toast.success('Velkommen tilbage')
    router.push(redirectTo)
    router.refresh()
  }

  const errorParam = searchParams.get('error')
  const rawRedirect = searchParams.get('redirectTo') ?? '/dashboard'
  const redirectTo = rawRedirect === '/' ? '/dashboard' : rawRedirect

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async ({ email, password }: LoginForm) => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError('Forkert e-mail eller adgangskode')
      return
    }
    toast.success('Velkommen tilbage')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-dark
                      p-12 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial from-forest-900/20 via-transparent to-transparent pointer-events-none" />

        {/* Top ornament */}
        <div className="relative z-10">
          <div className="flex flex-col items-center gap-4 mb-16">
            <img src="/HOLogoTransparent.png" alt="Hjortens Orden" className="w-96 h-96 object-contain drop-shadow-lg" />
            <p className="font-serif text-parchment text-2xl font-semibold tracking-wide">Hjortens Orden</p>
          </div>

          {/* Decorative quote */}

        </div>

        {/* Bottom flourish */}
        <div className="relative z-10">
          <div className="ornament text-gold/30 text-[10px]">
            <span>Est. 2010</span>
          </div>
          <p className="text-xs text-muted/60 text-center mt-3">
            Et eksklusivt broderskab funderet på tradition og fællesskab
          </p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-5">
            <img src="/HOLogoTransparent.png" alt="Hjortens Orden" className="w-[min(45vw,180px)] h-auto object-contain drop-shadow-lg" />
            <p className="font-serif text-parchment text-xl font-semibold tracking-wide">Hjortens Orden</p>
          </div>

          <h1 className="font-serif text-display-sm text-parchment mb-1">Velkommen tilbage</h1>
          <p className="text-sm text-muted mb-4">Log ind for at tilgå ordenen.</p>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-surface rounded-xl mb-6">
            <button
              onClick={() => { setMode('password'); setAuthError(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'password' ? 'bg-charcoal text-parchment shadow' : 'text-muted hover:text-parchment'
              }`}
            >
              <Lock size={14} /> Adgangskode
            </button>
            <button
              onClick={() => { setMode('otp'); setAuthError(null); setOtpError(null); setOtpStep('send') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'otp' ? 'bg-charcoal text-parchment shadow' : 'text-muted hover:text-parchment'
              }`}
            >
              <KeyRound size={14} /> Engangskode
            </button>
          </div>

          {/* Suspended/Deactivated warning */}
          {errorParam === 'account_suspended' && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/40
                            rounded-lg text-red-300 text-sm mb-6">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p>Din konto er suspenderet. Kontakt en administrator.</p>
            </div>
          )}

          {/* ── Password login ── */}
          {mode === 'password' && (
            <>
              {authError && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/40
                                rounded-lg text-red-300 text-sm mb-6">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{authError}</p>
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="E-mailadresse"
                  type="email"
                  autoComplete="email"
                  placeholder="dit@navn.dk"
                  leftIcon={<Mail size={16} />}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Adgangskode"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                  error={errors.password?.message}
                  {...register('password')}
                />
                <Button type="submit" variant="gold" size="lg" loading={isSubmitting} className="w-full mt-6">
                  Log ind
                </Button>
              </form>
            </>
          )}

          {/* ── OTP login ── */}
          {mode === 'otp' && (
            <div className="space-y-4">
              {otpError && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/40
                                rounded-lg text-red-300 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{otpError}</p>
                </div>
              )}

              {otpStep === 'send' ? (
                <>
                  <p className="text-xs text-muted -mt-1">Vi sender en 6-cifret kode til din e-mail.</p>
                  <Input
                    label="E-mailadresse"
                    type="email"
                    autoComplete="email"
                    placeholder="dit@navn.dk"
                    leftIcon={<Mail size={16} />}
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                  />
                  <Button variant="gold" size="lg" loading={otpLoading} className="w-full" onClick={sendOtp}>
                    Send kode
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 bg-surface rounded-xl border border-border">
                    <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
                    <p className="text-sm text-parchment/80">
                      Kode sendt til <span className="text-parchment font-medium">{otpEmail}</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-label-sm text-muted mb-1.5">6-cifret kode</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                      className="input-base w-full text-center text-2xl tracking-[0.5em] font-mono"
                    />
                  </div>
                  <Button variant="gold" size="lg" loading={otpLoading} className="w-full" onClick={verifyOtp}>
                    Verificer kode
                  </Button>
                  <button
                    onClick={() => { setOtpStep('send'); setOtpCode(''); setOtpError(null) }}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-parchment transition-colors mx-auto"
                  >
                    <ArrowLeft size={12} /> Skift e-mail eller send igen
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted/60">
              Adgang er kun for inviterede medlemmer.
              <br />Kontakt ordensformanden for at blive inviteret.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageContent /></Suspense>
}
