'use client'
import React, { useState } from 'react'
import ProfessionalVideoTimeline from '@/components/storyboard/ProfessionalVideoTimeline'
import { StoryboardFrame } from '@/types/storyboard'

// Mock data for demonstration
const mockFrames: StoryboardFrame[] = [
  {
    id: '1',
    scene: 1,
    shotDescription: 'A carousel horse spinning gracefully in the golden hour light',
    shot: 'Wide Shot',
    dialogue: '',
    sound: 'Carousel music',
    status: 'ready',
    duration: 3,
    imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    scene: 2,
    shotDescription: 'A man in a dark suit looking up with a gentle smile on a rooftop',
    shot: 'Medium Shot',
    dialogue: 'The city never sleeps, but tonight it feels different.',
    sound: 'City ambience',
    status: 'ready',
    duration: 4,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    scene: 3,
    shotDescription: 'A couple sitting at a cozy table in a dimly lit restaurant',
    shot: 'Close-up',
    dialogue: 'I never thought I would find someone like you.',
    sound: 'Soft jazz music',
    status: 'ready',
    duration: 3.5,
    imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop',
  },
  {
    id: '4',
    scene: 4,
    shotDescription: 'A woman in a red dress walking through a garden',
    shot: 'Tracking Shot',
    dialogue: '',
    sound: 'Nature sounds',
    status: 'ready',
    duration: 2.5,
    imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop',
  },
  {
    id: '5',
    scene: 5,
    shotDescription: 'A couple holding hands while walking down a tree-lined path',
    shot: 'Wide Shot',
    dialogue: 'This is where our story begins.',
    sound: 'Romantic music',
    status: 'ready',
    duration: 4,
    imageUrl: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=300&fit=crop',
  },
]

export default function TimelineDemoPage() {
  const [frames, setFrames] = useState<StoryboardFrame[]>(mockFrames)

  const handleUpdateFrame = (frameId: string, updates: Partial<StoryboardFrame>) => {
    setFrames(prev => prev.map(frame => (frame.id === frameId ? { ...frame, ...updates } : frame)))
  }

  const handleSave = () => {
    console.log('Saving timeline...', frames)
    alert('Timeline saved!')
  }

  const handleAddFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `frame-${Date.now()}`,
      scene: frames.length + 1,
      shotDescription: 'New scene description',
      shot: 'Medium Shot',
      dialogue: '',
      sound: '',
      status: 'ready',
      duration: 3,
    }
    setFrames(prev => [...prev, newFrame])
  }

  return (
    <div className="h-screen bg-neutral-950">
      <div className="h-full">
        <ProfessionalVideoTimeline
          frames={frames}
          onUpdateFrame={handleUpdateFrame}
          onSave={handleSave}
          onAddFrame={handleAddFrame}
        />
      </div>
    </div>
  )
}
