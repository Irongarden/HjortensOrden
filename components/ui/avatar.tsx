import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  ring?: boolean
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-28 h-28 text-2xl',
}

export function Avatar({ src, name, size = 'md', className, ring }: AvatarProps) {
  const initials = getInitials(name)

  return (
    <div className={cn(
      'relative rounded-full bg-surface border border-border flex items-center justify-center',
      'font-serif font-medium text-gold overflow-hidden flex-shrink-0',
      sizeClasses[size],
      ring && 'ring-2 ring-gold/30 ring-offset-2 ring-offset-obsidian',
      className
    )}>
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="80px" />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  )
}

export function AvatarGroup({
  members,
  max = 4,
  size = 'sm',
}: {
  members: Array<{ id: string; full_name: string; avatar_url?: string | null }>
  max?: number
  size?: AvatarProps['size']
}) {
  const visible = members.slice(0, max)
  const overflow = members.length - max

  return (
    <div className="flex items-center">
      {visible.map((member, i) => (
        <div
          key={member.id}
          className={cn('-ml-2 first:ml-0 ring-2 ring-obsidian rounded-full')}
          style={{ zIndex: visible.length - i }}
        >
          <Avatar
            src={member.avatar_url}
            name={member.full_name}
            size={size}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn(
          '-ml-2 bg-surface border border-border rounded-full flex items-center justify-center',
          'text-muted font-medium ring-2 ring-obsidian',
          sizeClasses[size],
        )}>
          <span className="text-xs">+{overflow}</span>
        </div>
      )}
    </div>
  )
}
