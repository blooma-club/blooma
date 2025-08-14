'use client'

import { useState } from 'react'
import { useUIStore } from '@/store/ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewProjectModal() {
  const { isNewProjectModalOpen, closeNewProjectModal } = useUIStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return

    setIsLoading(true)
    // TODO: Implement project creation logic

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      closeNewProjectModal()
      setName('')
      setDescription('')
    }, 1000)
  }

  return (
    <Dialog open={isNewProjectModalOpen} onOpenChange={closeNewProjectModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your new project a name and an optional description.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Awesome Storyboard"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="(Optional) A short description of the project."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="reverse" onClick={closeNewProjectModal}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
