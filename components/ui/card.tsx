import { forwardRef, HTMLAttributes } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'glow'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantClasses = {
  default: 'bg-charcoal border border-border',
  surface: 'bg-surface border border-border',
  glow:    'bg-charcoal border border-gold/20 shadow-gold-sm',
}

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl shadow-card transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-serif text-heading-md text-parchment', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  className,
  href,
}: {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  className?: string
  href?: string
}) {
  const inner = (
    <Card className={cn('hover:border-gold/20 group', href && 'cursor-pointer hover:border-gold/40 hover:shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-label-sm text-muted uppercase tracking-widest mb-2">{label}</p>
          <p className="text-display-sm font-serif text-parchment truncate">{value}</p>
          {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
          {trend && (
            <p className={cn(
              'text-xs mt-2 flex items-center gap-1 font-medium',
              trend.value >= 0 ? 'text-forest-400' : 'text-red-400'
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-3 p-3 rounded-lg bg-surface border border-border
                          group-hover:border-gold/20 text-muted group-hover:text-gold
                          transition-all duration-300 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}
