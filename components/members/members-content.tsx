'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, UserPlus, Map, Users } from 'lucide-react'
import { useMembers } from '@/lib/hooks/use-members'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleBadge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageLoader } from '@/components/ui/skeleton'
import { InviteModal } from './invite-modal'
import { MemberProfileModal } from './member-profile-modal'
import { MemberMap } from './member-map'
import { getMembershipYears } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

type ViewTab = 'list' | 'map'

export function MembersContent() {
  const { can } = useAuthStore()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [tab, setTab] = useState<ViewTab>('list')

  const { data: members = [], isLoading } = useMembers()

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    )
  })

  if (isLoading) return <PageLoader />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-end justify-between page-header-row">
        <div>
          <p className="text-label-sm text-muted uppercase tracking-widest mb-1">Ordenens</p>
          <h1 className="font-serif text-display-sm text-parchment">Medlemmer</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setTab('list')}
              className={`p-1.5 rounded-md transition-all ${tab === 'list' ? 'bg-charcoal text-parchment' : 'text-muted hover:text-parchment'}`}
              title="Listevisning"
            >
              <Users size={16} />
            </button>
            <button
              onClick={() => setTab('map')}
              className={`p-1.5 rounded-md transition-all ${tab === 'map' ? 'bg-charcoal text-parchment' : 'text-muted hover:text-parchment'}`}
              title="Kortvisning"
            >
              <Map size={16} />
            </button>
          </div>
          {can('invite_members') && (
            <Button variant="gold" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus size={16} /> Inviter
            </Button>
          )}
        </div>
      </div>

      {tab === 'map' ? (
        <MemberMap />
      ) : (
        <>
          {/* Search */}
          <Input
            leftIcon={<Search size={15} className="text-muted" />}
            placeholder="Søg efter navn, e-mail eller rolle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Member grid */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((member) => (
              <motion.button
                key={member.id}
                variants={item}
                onClick={() => setSelected(member)}
                className="text-left bg-charcoal border border-border rounded-xl p-4 hover:border-gold/30 hover:shadow-card transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={member.avatar_url} name={member.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-parchment group-hover:text-gold transition-colors truncate">
                        {member.full_name}
                      </p>
                      <StatusBadge status={member.status} />
                    </div>
                    <RoleBadge role={member.role} className="mt-1" />
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                      {member.joined_at && (
                        <span>{getMembershipYears(member.joined_at)} år</span>
                      )}
                      {member.phone && <span>{member.phone}</span>}
                      {member.city && <span>{member.city}</span>}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted">
              <p className="font-serif text-parchment/50 text-heading-sm">Ingen medlemmer fundet</p>
              <p className="text-sm mt-1">Prøv en anden søgning</p>
            </div>
          )}
        </>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {selected && (
        <MemberProfileModal member={selected} onClose={() => setSelected(null)} />
      )}
    </motion.div>
  )
}
