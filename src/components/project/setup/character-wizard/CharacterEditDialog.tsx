'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Character } from './types'
import { CharacterEditForm } from './CharacterEditForm'

type Props = {
  open: boolean
  character: Character | null
  onClose: () => void
  onSave: (character: Character) => void
  projectId?: string
  userId?: string
}

export function CharacterEditDialog({
  open,
  character,
  onClose,
  onSave,
  projectId,
  userId,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-neutral-700 bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {character ? `Edit Character: ${character.name}` : 'Edit Character'}
          </DialogTitle>
        </DialogHeader>
        {character ? (
          <CharacterEditForm
            character={character}
            onSave={updated => {
              onSave(updated)
              onClose()
            }}
            onCancel={onClose}
            projectId={projectId}
            userId={userId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

