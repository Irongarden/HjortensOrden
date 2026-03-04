'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useCreateEvent, useUpdateEvent } from '@/lib/hooks/use-events'
import { Event } from '@/lib/types'

const eventSchema = z.object({
  title:       z.string().min(2, 'Titel er påkrævet'),
  description: z.string().optional(),
  location:    z.string().optional(),
  starts_at:   z.string().min(1, 'Startdato er påkrævet'),
  ends_at:     z.string().min(1, 'Slutdato er påkrævet'),
  status:      z.enum(['draft','published','cancelled','completed']),
  budget_dkk:  z.coerce.number().optional(),
  is_recurring:z.boolean().default(false),
})

type EventForm = z.infer<typeof eventSchema>

interface EventModalProps {
  open: boolean
  onClose: () => void
  event?: Event
  defaultStartDate?: string
}

export function EventModal({ open, onClose, event, defaultStartDate }: EventModalProps) {
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const isEdit = !!event

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue, getValues } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? {
      title:       event.title,
      description: event.description ?? '',
      location:    event.location ?? '',
      starts_at:   event.starts_at?.slice(0, 16),
      ends_at:     event.ends_at?.slice(0, 16),
      status:      event.status,
      budget_dkk:  event.budget_dkk ?? undefined,
      is_recurring:event.is_recurring,
    } : {
      status: 'published',
      is_recurring: false,
      starts_at: defaultStartDate,
      ends_at: defaultStartDate,
    },
  })

  // Skip auto-sync on form initialisation (reset on open), only sync on user changes
  const skipNextSync = useRef(false)
  const startsAt = watch('starts_at')

  // Re-seed form when modal opens or a new calendar slot is clicked
  useEffect(() => {
    if (!open) return
    skipNextSync.current = true
    if (event) {
      reset({
        title:        event.title,
        description:  event.description ?? '',
        location:     event.location ?? '',
        starts_at:    event.starts_at?.slice(0, 16),
        ends_at:      event.ends_at?.slice(0, 16),
        status:       event.status,
        budget_dkk:   event.budget_dkk ?? undefined,
        is_recurring: event.is_recurring,
      })
    } else {
      reset({
        status:       'published',
        is_recurring: false,
        starts_at:    defaultStartDate ?? '',
        ends_at:      defaultStartDate ?? '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStartDate])

  // Auto-sync ends_at to same month when starts_at month changes
  useEffect(() => {
    if (skipNextSync.current) { skipNextSync.current = false; return }
    if (!startsAt) return
    const startDate = new Date(startsAt)
    if (isNaN(startDate.getTime())) return
    const currentEndsAt = getValues('ends_at')
    if (!currentEndsAt) { setValue('ends_at', startsAt); return }
    const endDate = new Date(currentEndsAt)
    if (isNaN(endDate.getTime())) return
    if (
      endDate < startDate ||
      startDate.getMonth() !== endDate.getMonth() ||
      startDate.getFullYear() !== endDate.getFullYear()
    ) {
      setValue('ends_at', startsAt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt])

  const onSubmit = async (data: EventForm) => {
    if (isEdit) {
      await update.mutateAsync({ id: event.id, ...data })
    } else {
      await create.mutateAsync(data)
    }
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Rediger begivenhed' : 'Ny begivenhed'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Annuller</Button>
          <Button variant="gold" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Gem ændringer' : 'Opret begivenhed'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Titel"
          placeholder="Ordensmøde, Jubilæumsfest…"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Beskrivelse"
          placeholder="Beskriv begivenheden…"
          error={errors.description?.message}
          {...register('description')}
        />

        <Input
          label="Lokation"
          placeholder="Ordenens mødesal, Adresse…"
          {...register('location')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Startdato & -tid"
            type="datetime-local"
            error={errors.starts_at?.message}
            {...register('starts_at')}
          />
          <Input
            label="Slutdato & -tid"
            type="datetime-local"
            error={errors.ends_at?.message}
            {...register('ends_at')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget (DKK)"
            type="number"
            placeholder="0"
            hint="Planlagt budget for begivenheden"
            {...register('budget_dkk')}
          />
          <Select
            label="Status"
            options={[
              { value: 'draft',     label: 'Kladde' },
              { value: 'published', label: 'Publiceret' },
              { value: 'cancelled', label: 'Aflyst' },
              { value: 'completed', label: 'Afholdt' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-forest rounded"
            {...register('is_recurring')}
          />
          <span className="text-sm text-parchment/80">Tilbagevendende begivenhed</span>
        </label>
      </form>
    </Modal>
  )
}
