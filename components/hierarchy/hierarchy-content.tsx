'use client'

import { motion } from 'framer-motion'
import { useMembers } from '@/lib/hooks/use-members'
import { PageLoader } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/ui/badge'
import { getMembershipYears } from '@/lib/utils'
import { ROLE_HIERARCHY } from '@/lib/rbac'
import type { MemberRole, Profile } from '@/lib/types'

const ROLE_TITLES: Record<MemberRole, string> = {
  admin: 'Administrator',
  chairman: 'Formand',
  vice_chairman: 'Næstformand',
  treasurer: 'Kasserer',
  librarian: 'Bibliotekar',
  member: 'Menigt Medlem',
}

const ROLE_ORNAMENTS: Record<MemberRole, string> = {
  admin: '⚙',
  chairman: '👑',
  vice_chairman: '🦌',
  treasurer: '⚖',
  librarian: '📖',
  member: '🌿',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export function HierarchyContent() {
  const { data: members = [], isLoading } = useMembers()

  if (isLoading) return <PageLoader />

  const activeMembers = members.filter((m) => m.status === 'active')

  // Group by role in hierarchy order (most senior first)
  const byRole: Partial<Record<MemberRole, Profile[]>> = {}
  ;[...ROLE_HIERARCHY].reverse().forEach((role) => {
    const roleMembers = activeMembers.filter((m) => m.role === role)
    if (roleMembers.length > 0) byRole[role] = roleMembers
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
        <h1 className="font-serif text-display-sm text-parchment">Hierarki</h1>
      </div>

      {/* Org tree */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
        {(Object.entries(byRole) as [MemberRole, Profile[]][]).map(([role, roleMembers], tierIdx) => (
          <motion.div key={role} variants={item}>
            {/* Tier header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border border-border rounded-full">
                <span className="text-lg">{ROLE_ORNAMENTS[role]}</span>
                <span className="text-sm font-medium text-parchment/80">{ROLE_TITLES[role]}</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>

            {/* Member cards */}
            <div className={`flex flex-wrap gap-4 justify-center ${tierIdx === 0 ? 'md:justify-center' : ''}`}>
              {roleMembers.map((member) => (
                <HierarchyMemberCard key={member.id} member={member} prominent={tierIdx < 2} />
              ))}
            </div>

            {/* Connector to next tier */}
            {tierIdx < Object.keys(byRole).length - 1 && (
              <div className="flex justify-center mt-6">
                <div className="w-px h-8 bg-gradient-to-b from-border to-transparent" />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

function HierarchyMemberCard({ member, prominent }: { member: Profile; prominent: boolean }) {
  const years = member.joined_at ? getMembershipYears(member.joined_at) : 0

  return (
    <div className={`bg-charcoal border rounded-xl text-center flex flex-col items-center transition-all hover:border-gold/30 hover:shadow-card ${
      prominent
        ? 'border-gold/20 p-6 w-44 shadow-gold-sm'
        : 'border-border p-4 w-36'
    }`}>
      <Avatar
        src={member.avatar_url}
        name={member.full_name}
        size={prominent ? 'xl' : 'lg'}
        ring={prominent}
      />
      <p className={`font-serif text-parchment mt-3 ${prominent ? 'text-heading-xs' : 'text-sm'}`}>
        {member.full_name}
      </p>
      <RoleBadge role={member.role} className="mt-1.5" />
      {years > 0 && (
        <p className="text-[10px] text-muted mt-1.5 font-mono">{years} år</p>
      )}
    </div>
  )
}
