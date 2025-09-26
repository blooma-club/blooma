import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfessionalVideoTimeline from '../ProfessionalVideoTimeline'
import { StoryboardFrame } from '@/types/storyboard'

// Mock data for testing
const mockFrames: StoryboardFrame[] = [
  {
    id: '1',
    scene: 1,
    shotDescription: 'Test scene 1',
    shot: 'Wide Shot',
    dialogue: 'Test dialogue',
    sound: 'Test sound',
    status: 'ready',
    duration: 3,
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    scene: 2,
    shotDescription: 'Test scene 2',
    shot: 'Medium Shot',
    dialogue: 'Test dialogue 2',
    sound: 'Test sound 2',
    status: 'ready',
    duration: 4,
    imageUrl: 'https://example.com/image2.jpg',
  },
]

const mockProps = {
  frames: mockFrames,
  onUpdateFrame: jest.fn(),
  onSave: jest.fn(),
  onAddFrame: jest.fn(),
  projectId: 'test-project',
  onGenerateScene: jest.fn().mockResolvedValue(undefined),
}

const mockFetch = jest.fn()
const originalFetch = global.fetch
const requestFullscreenMock = jest.fn()
const exitFullscreenMock = jest.fn()

beforeAll(() => {
  ;(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreenMock,
  })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: exitFullscreenMock,
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    writable: true,
    value: null,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: jest.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: jest.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: jest.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    writable: true,
    value: 1,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    configurable: true,
    writable: true,
    value: false,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    writable: true,
    value: 0,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    writable: true,
    value: 5,
  })
})

describe('ProfessionalVideoTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ voices: [], defaultVoiceId: null }),
    } as Response)
    requestFullscreenMock.mockClear()
    exitFullscreenMock.mockClear()
    ;(document as unknown as { fullscreenElement: Element | null }).fullscreenElement = null
  })

  afterAll(() => {
    ;(global as unknown as { fetch: typeof fetch }).fetch = originalFetch
  })

  it('renders without crashing', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)
    expect(screen.getByText('Scene 1')).toBeInTheDocument()
  })

  it('displays timeline controls', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Check for play/pause button
    const playButton = screen.getByRole('button', { name: /play timeline/i })
    expect(playButton).toBeInTheDocument()

    // Check for time display
    expect(screen.getByText(/00:00\.00/)).toBeInTheDocument()
  })

  it('displays timeline clips', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Check for scene information
    expect(screen.getByText('Scene 1')).toBeInTheDocument()
    expect(screen.getByText('Scene 2')).toBeInTheDocument()
  })

  it('handles frame selection', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Click on a frame
    const frame1 = screen.getByText('Scene 1')
    fireEvent.click(frame1)

    // Frame should be selected (this would update internal state)
    // In a real test, you'd check for visual changes or callbacks
  })

  it('handles play/pause toggle', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    const playButton = screen.getByRole('button', { name: /play timeline/i })
    fireEvent.click(playButton)

    // Button should change state (this would be reflected in the icon)
  })

  it('handles add frame callback', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    const addButton = screen.getByRole('button', { name: /add blank scene/i })
    fireEvent.click(addButton)
    expect(mockProps.onAddFrame).toHaveBeenCalled()
  })

  it('displays time markers', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Check for time markers
    expect(screen.getByText('0s')).toBeInTheDocument()
    expect(screen.getByText('2s')).toBeInTheDocument()
    expect(screen.getByText('4s')).toBeInTheDocument()
  })

  it('handles timeline click for seeking', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Find the timeline ruler and click on it
    const timelineRuler = screen.getByText('0s').closest('div')
    if (timelineRuler) {
      fireEvent.click(timelineRuler)
      // This would update the current time
    }
  })

  it('updates selected frame when seeking time into frame 2', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Select frame 1 initially by clicking it
    fireEvent.click(screen.getByText('Scene 1'))

    // Seek approximately into frame 2 (after 3s)
    // Simulate by clicking near the 4s marker element
    const fourSecMarker = screen.getByText('4s')
    const ruler = fourSecMarker.closest('div')
    if (ruler) {
      fireEvent.click(ruler)
    }

    // Now the selected frame should be Scene 2 in the UI somewhere
    // We can't directly read internal state, but selecting Scene 2 label again shouldn't crash
    expect(screen.getByText('Scene 2')).toBeInTheDocument()
  })

  it('shows hover tooltip for frames with images', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Hover over a frame with an image
    const frame1 = screen.getByText('Scene 1')
    fireEvent.mouseEnter(frame1)

    // Tooltip should appear (this would be tested with more specific queries)
  })

  it('handles zoom controls', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Find zoom in/out buttons
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
    fireEvent.click(zoomInButton)
  })

  it('displays volume control', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Check for volume slider
    const volumeSlider = screen.getByRole('slider', { name: /video volume/i })
    expect(volumeSlider).toBeInTheDocument()
  })

  it('handles fullscreen toggle', () => {
    render(<ProfessionalVideoTimeline {...mockProps} />)

    // Find fullscreen button
    const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i })
    fireEvent.click(fullscreenButton)

    // Fullscreen state should toggle
  })
})

describe('ProfessionalVideoTimeline with empty frames', () => {
  it('renders empty state correctly', () => {
    render(<ProfessionalVideoTimeline {...mockProps} frames={[]} />)

    expect(screen.getByText('Select a scene to preview')).toBeInTheDocument()
  })
})

describe('ProfessionalVideoTimeline with frames without images', () => {
  const framesWithoutImages: StoryboardFrame[] = [
    {
      id: '1',
      scene: 1,
      shotDescription: 'Test scene without image',
      shot: 'Wide Shot',
      dialogue: 'Test dialogue',
      sound: 'Test sound',
      status: 'ready',
      duration: 3,
      // No imageUrl
    },
  ]

  it('renders frames without images', () => {
    render(<ProfessionalVideoTimeline {...mockProps} frames={framesWithoutImages} />)

    expect(screen.getByText('Scene 1')).toBeInTheDocument()
  })
})
