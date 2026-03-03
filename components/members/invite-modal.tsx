'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const schema = z.object({
  email: z.string().email('Ugyldig e-mailadresse'),
  full_name: z.string().min(2, 'Navn er for kort'),
  role: z.enum(['member', 'librarian', 'treasurer', 'vice_chairman', 'chairman', 'admin']),
})
type FormData = z.infer<typeof schema>

interface InviteModalProps {
  open: boolean
  onClose: () => void
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'member' },
  })

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Kunne ikke sende invitation')
      return
    }

    toast.success(`Invitation sendt til ${data.email}`)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inviter nyt medlem"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button variant="gold" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>
            Send invitation
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="navn@eksempel.dk"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Fulde navn"
          placeholder="Jens Hjort"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Select
          label="Rolle"
          options={[
            { value: 'member', label: 'Menigt Medlem' },
            { value: 'librarian', label: 'Bibliotekar' },
            { value: 'treasurer', label: 'Kasserer' },
            { value: 'vice_chairman', label: 'Næstformand' },
            { value: 'chairman', label: 'Formand' },
            { value: 'admin', label: 'Administrator' },
          ]}
          {...register('role')}
        />
      </form>
    </Modal>
  )
}
