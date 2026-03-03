import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'outline' | 'danger' | 'green'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  gold:    'bg-gold text-obsidian hover:bg-gold/90 active:scale-[0.98] shadow-gold-sm font-semibold',
  ghost:   'text-parchment/80 hover:text-parchment hover:bg-surface/70 border border-transparent hover:border-border',
  outline: 'border border-border text-parchment hover:border-gold/40 hover:bg-surface/50',
  danger:  'bg-red-900/40 text-red-300 border border-red-800/40 hover:bg-red-900/60',
  green:   'bg-forest text-ivory hover:bg-forest-600 active:scale-[0.98]',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm:   'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md:   'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg:   'px-6 py-3 text-base rounded-lg gap-2.5',
  icon: 'p-2 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'outline', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40',
          'disabled:opacity-40 disabled:pointer-events-none select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={16} />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
