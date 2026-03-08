'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { useChangeMemberRole, useChangeMemberStatus } from '@/lib/hooks/use-members'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { RoleBadge, StatusBadge } from '@/components/ui/badge'
import { formatDate, getMembershipYears, compressImage } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Profile, MemberRole, MemberStatus } from '@/lib/types'

interface MemberProfileModalProps {
  member: Profile
  onClose: () => void
}

export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  const { can, profile: me } = useAuthStore()
  const qc = useQueryClient()
  const changeRole = useChangeMemberRole()
  const changeStatus = useChangeMemberStatus()
  const [role, setRole] = useState<MemberRole>(member.role)
  const [status, setStatus] = useState<MemberStatus>(member.status)
  const [editing, setEditing] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isMyProfile = me?.id === member.id
  const canEdit = can('manage_members') && !isMyProfile
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Fejl ved sletning'); return }
      toast.success(`${member.full_name} er blevet slettet`)
      qc.invalidateQueries({ queryKey: ['members'] })
      onClose()
    } catch {
      toast.error('Netværksfejl. Prøv igen.')
    } finally {
      setDeleting(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(file, { maxPx: 800, quality: 0.85 })
      setAvatarPreview(URL.createObjectURL(compressed))
      const form = new FormData()
      form.append('file', compressed)
      form.append('memberId', member.id)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload fejlede')
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Profilbillede opdateret')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Upload fejlede')
      setAvatarPreview(null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    if (role !== member.role) await changeRole.mutateAsync({ userId: member.id, role })
    if (status !== member.status) await changeStatus.mutateAsync({ userId: member.id, status })
    setEditing(false)
    onClose()
  }

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title=""
        size="sm"
        footer={
          canEdit ? (
            <div className="flex items-center justify-between w-full gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => setDeleteConfirm(true)}
                disabled={deleting}
              >
                <Trash2 size={15} />
                Slet
              </Button>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Annuller</Button>
                    <Button variant="gold" loading={changeRole.isPending || changeStatus.isPending} onClick={handleSave}>
                      Gem ændringer
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>Rediger</Button>
                )}
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={onClose}>Luk</Button>
          )
        }
      >
        <div className="space-y-5">
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Avatar src={avatarPreview ?? member.avatar_url} name={member.full_name} size="xl" ring />
              {canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold border-2 border-obsidian flex items-center justify-center hover:bg-gold/80 transition-colors disabled:opacity-50"
                    title="Skift profilbillede"
                  >
                    {avatarUploading
                      ? <Upload size={11} className="text-obsidian animate-pulse" />
                      : <Camera size={11} className="text-obsidian" />}
                  </button>
                </>
              )}
            </div>
            <div>
              <h3 className="font-serif text-heading-sm text-parchment">{member.full_name}</h3>
              <p className="text-sm text-muted">{member.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <RoleBadge role={member.role} />
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {member.joined_at && (
              <div className="bg-surface rounded-lg p-3">
                <p className="text-muted text-xs mb-0.5">Indmeldt</p>
                <p className="text-parchment font-medium">{formatDate(member.joined_at)}</p>
              </div>
            )}
            {member.joined_at && (
              <div className="bg-surface rounded-lg p-3">
                <p className="text-muted text-xs mb-0.5">Anciennitet</p>
                <p className="text-parchment font-medium">{getMembershipYears(member.joined_at)} år</p>
              </div>
            )}
            {member.phone && (
              <div className="bg-surface rounded-lg p-3 col-span-2">
                <p className="text-muted text-xs mb-0.5">Telefon</p>
                <p className="text-parchment font-medium">{member.phone}</p>
              </div>
            )}
          </div>

          {member.bio && (
            <div className="bg-surface rounded-lg p-3 text-sm">
              <p className="text-muted text-xs mb-1">Bio</p>
              <p className="text-parchment/80">{member.bio}</p>
            </div>
          )}

          {/* Edit fields */}
          {editing && (
            <div className="space-y-3 border-t border-border pt-4">
              <Select
                label="Rolle"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                options={[
                  { value: 'member', label: 'Menigt Medlem' },
                  { value: 'librarian', label: 'Bibliotekar' },
                  { value: 'treasurer', label: 'Kasserer' },
                  { value: 'vice_chairman', label: 'Næstformand' },
                  { value: 'chairman', label: 'Formand' },
                  { value: 'admin', label: 'Administrator' },
                ]}
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                options={[
                  { value: 'active', label: 'Aktiv' },
                  { value: 'inactive', label: 'Inaktiv' },
                  { value: 'suspended', label: 'Suspenderet' },
                  { value: 'deactivated', label: 'Deaktiveret' },
                ]}
              />
            </div>
          )}
        </div>
      </Modal>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-charcoal border border-red-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm text-parchment">Slet medlem</h3>
                <p className="text-sm text-muted mt-0.5">Denne handling kan ikke fortrydes.</p>
              </div>
            </div>
            <p className="text-sm text-parchment/80">
              Er du sikker på, at du vil slette <span className="font-semibold text-parchment">{member.full_name}</span>?
              Al data tilknyttet dette medlem vil blive permanent fjernet.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Annuller</Button>
              <Button
                variant="ghost"
                className="bg-red-700 hover:bg-red-600 text-white"
                loading={deleting}
                onClick={handleDelete}
              >
                Ja, slet permanent
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
