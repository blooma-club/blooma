import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TimelineEditor from '../TimelineEditor'
import { StoryboardFrame } from '@/types/storyboard'

// Mock frames for testing
const mockFrames: StoryboardFrame[] = [
  {
    id: '1',
    scene: 1,
    shotDescription: 'Opening scene with protagonist',
    shot: 'wide',
    dialogue: 'Hello, world!',
    sound: 'ambient music',
    status: 'ready',
    duration: 5,
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    scene: 2,
    shotDescription: 'Close-up of character',
    shot: 'close-up',
    dialogue: 'This is exciting!',
    sound: 'dialogue only',
    status: 'ready',
    duration: 3,
    imageUrl: 'https://example.com/image2.jpg',
  },
]

const mockOnUpdateFrame = jest.fn()
const mockOnSave = jest.fn()

describe('TimelineEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders timeline editor with frames', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Duration:')).toBeInTheDocument()
    expect(screen.getByText('00:08.00')).toBeInTheDocument()
  })

  it('displays scene tracks on timeline', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    expect(screen.getByText('Video Track 1')).toBeInTheDocument()
    expect(screen.getByText('Audio Track 1')).toBeInTheDocument()
    expect(screen.getByText('Voice Over Track')).toBeInTheDocument()
  })

  it('shows properties panel when frame is selected', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    // Click on first scene
    const sceneElement = screen.getByText(/S1/)
    fireEvent.click(sceneElement)

    expect(screen.getByText('Scene 1 Properties')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5')).toBeInTheDocument() // Duration input
  })

  it('calls onUpdateFrame when duration is changed', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    // Click on first scene to select it
    const sceneElement = screen.getByText(/S1/)
    fireEvent.click(sceneElement)

    // Change duration
    const durationInput = screen.getByDisplayValue('5')
    fireEvent.change(durationInput, { target: { value: '7' } })

    expect(mockOnUpdateFrame).toHaveBeenCalledWith('1', { duration: 7 })
  })

  it('calls onSave when save button is clicked', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    const saveButton = screen.getByText('Save Timeline')
    fireEvent.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('shows play/pause button', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    const playButton = screen.getByText('Play')
    expect(playButton).toBeInTheDocument()

    fireEvent.click(playButton)
    expect(screen.getByText('Pause')).toBeInTheDocument()
  })

  it('displays frame images in timeline tracks', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    // Check if images are rendered in the timeline
    const images = screen.getAllByAltText(/Scene \d/)
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg')
    expect(images[1]).toHaveAttribute('src', 'https://example.com/image2.jpg')
  })

  it('shows frame image in properties panel when selected', () => {
    render(
      <TimelineEditor frames={mockFrames} onUpdateFrame={mockOnUpdateFrame} onSave={mockOnSave} />
    )

    // Click on first scene to select it
    const sceneElement = screen.getByText(/S1/)
    fireEvent.click(sceneElement)

    // Check if the selected frame's image is displayed in the properties panel
    const propertyPanelImage = screen.getByAltText('Scene 1')
    expect(propertyPanelImage).toBeInTheDocument()
    expect(propertyPanelImage).toHaveAttribute('src', 'https://example.com/image1.jpg')
  })
})
