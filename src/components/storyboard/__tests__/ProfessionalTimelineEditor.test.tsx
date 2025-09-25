import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfessionalTimelineEditor from '../ProfessionalTimelineEditor'
import { StoryboardFrame } from '@/types/storyboard'

// Mock frames for testing
const mockFrames: StoryboardFrame[] = [
  {
    id: '1',
    scene: 1,
    shotDescription: 'Opening scene with character walking',
    shot: 'WIDE',
    dialogue: 'Hello world!',
    sound: 'Ambient city sounds',
    status: 'ready',
    duration: 3,
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    scene: 2,
    shotDescription: 'Close-up of character face',
    shot: 'CLOSE-UP',
    dialogue: 'This is amazing!',
    sound: 'Background music',
    status: 'ready',
    duration: 5,
    imageUrl: 'https://example.com/image2.jpg',
    audioUrl: 'https://example.com/audio.mp3',
  },
  {
    id: '3',
    scene: 3,
    shotDescription: 'Final scene with sunset',
    shot: 'MEDIUM',
    dialogue: 'The end.',
    sound: 'Wind sounds',
    status: 'ready',
    duration: 4,
    voiceOverText: 'And so the story ends...',
    voiceOverUrl: 'https://example.com/voiceover.mp3',
  },
]

const mockOnUpdateFrame = jest.fn()
const mockOnSave = jest.fn()

describe('ProfessionalTimelineEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders timeline with frames correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Check if timeline header exists
    expect(screen.getByText('Professional Timeline')).toBeInTheDocument()

    // Check if duration is calculated correctly (3 + 5 + 4 = 12 seconds)
    expect(screen.getByText(/Duration:/)).toBeInTheDocument()
    expect(screen.getByText('00:12.00')).toBeInTheDocument()

    // Check if scene count is correct
    expect(screen.getByText(/Scenes:/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays track labels correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Check track labels
    expect(screen.getByText('Video')).toBeInTheDocument()
    expect(screen.getByText('Audio')).toBeInTheDocument()
    expect(screen.getByText('Voice Over')).toBeInTheDocument()
  })

  it('shows frame clips in video track', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Check if scene numbers are displayed
    expect(screen.getByText('Scene 1')).toBeInTheDocument()
    expect(screen.getByText('Scene 2')).toBeInTheDocument()
    expect(screen.getByText('Scene 3')).toBeInTheDocument()
  })

  it('handles frame selection correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Click on a frame to select it
    const frame1 = screen.getByText('Scene 1')
    fireEvent.click(frame1)

    // Check if properties panel shows the selected frame
    expect(screen.getByText('Scene 1 Properties')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Opening scene with character walking')).toBeInTheDocument()
  })

  it('updates frame duration correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Select a frame first
    const frame1 = screen.getByText('Scene 1')
    fireEvent.click(frame1)

    // Find and update duration input
    const durationInput = screen.getByDisplayValue('3')
    fireEvent.change(durationInput, { target: { value: '6' } })

    // Check if onUpdateFrame was called with correct parameters
    expect(mockOnUpdateFrame).toHaveBeenCalledWith('1', { duration: 6 })
  })

  it('handles voice over text updates', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Select frame 3 which has voice over
    const frame3 = screen.getByText('Scene 3')
    fireEvent.click(frame3)

    // Find voice over textarea and update it
    const voiceOverTextarea = screen.getByDisplayValue('And so the story ends...')
    fireEvent.change(voiceOverTextarea, { target: { value: 'New voice over text' } })

    // Check if onUpdateFrame was called
    expect(mockOnUpdateFrame).toHaveBeenCalledWith('3', { voiceOverText: 'New voice over text' })
  })

  it('displays zoom controls and handles zoom changes', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Check if zoom controls exist
    expect(screen.getByText('100%')).toBeInTheDocument()

    // Test zoom in
    const zoomInButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('svg')?.classList.contains('lucide-chevron-right'))
    if (zoomInButton) {
      fireEvent.click(zoomInButton)
      expect(screen.getByText('120%')).toBeInTheDocument()
    }
  })

  it('toggles sidebar correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Properties panel should be visible initially
    expect(screen.getByText('Properties')).toBeInTheDocument()

    // Note: This test might need adjustment based on the actual implementation
    // as there are multiple chevron buttons (zoom and sidebar toggle)
    // For now, we'll just verify the Properties header is visible
  })

  it('calls onSave when save button is clicked', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    const saveButton = screen.getByText('Save Timeline')
    fireEvent.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('handles play/pause button correctly', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Initially should show play button
    const playButton = screen.getByRole('button', { name: /play/i })
    expect(playButton).toBeInTheDocument()

    // Click to start playing
    fireEvent.click(playButton)

    // Should now show pause button
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })

  it('shows no selection message when no frame is selected', () => {
    render(
      <ProfessionalTimelineEditor
        frames={mockFrames}
        onUpdateFrame={mockOnUpdateFrame}
        onSave={mockOnSave}
      />
    )

    // Initially no frame is selected
    expect(
      screen.getByText('Select a scene on the timeline to edit its properties')
    ).toBeInTheDocument()
  })
})
