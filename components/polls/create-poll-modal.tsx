'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useCreatePoll } from '@/lib/hooks/use-polls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const schema = z.object({
  title: z.string().min(5, 'Spørgsmål er for kort'),
  is_anonymous: z.boolean().default(false),
  deadline: z.string().optional(),
  options: z.array(z.object({ text: z.string().min(1, 'Skriv et svar') })).min(2, 'Tilføj mindst 2 svarmuligheder'),
})

type FormData = z.infer<typeof schema>

interface CreatePollModalProps {
  open: boolean
  onClose: () => void
}

export function CreatePollModal({ open, onClose }: CreatePollModalProps) {
  const createPoll = useCreatePoll()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', is_anonymous: false, deadline: '', options: [{ text: '' }, { text: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'options' })

  const onSubmit = async (data: FormData) => {
    await createPoll.mutateAsync({
      title: data.title,
      is_anonymous: data.is_anonymous,
      deadline: data.deadline || new Date(Date.now() + 7 * 86400_000).toISOString(),
      min_participation: 0,
      options: data.options.map((o) => o.text),
    })
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ny afstemning"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuller</Button>
          <Button variant="gold" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>Opret</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Spørgsmål"
          placeholder="Hvad skal broderskabet beslutte?"
          error={errors.title?.message}
          {...register('title')}
        />

        <div>
          <label className="block text-label-sm text-muted mb-2">Svarmuligheder</label>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder={`Svar ${i + 1}`}
                  error={errors.options?.[i]?.text?.message}
                  {...register(`options.${i}.text`)}
                />
                {fields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {(errors.options as { message?: string })?.message && (
            <p className="text-xs text-red-400 mt-1">{(errors.options as { message?: string }).message}</p>
          )}
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => append({ text: '' })}>
            <Plus size={14} /> Tilføj svar
          </Button>
        </div>

        <Input label="Lukker (valgfri)" type="datetime-local" {...register('deadline')} />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-gold"
            {...register('is_anonymous')}
          />
          <span className="text-sm text-parchment/80">Anonym afstemning</span>
        </label>
      </form>
    </Modal>
  )
}
