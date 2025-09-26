# Professional Video Timeline Components

This document describes the professional video timeline components designed to match modern video editing interfaces like those shown in the reference image.

## Components Overview

### 1. ProfessionalVideoTimeline

**File:** `src/components/storyboard/ProfessionalVideoTimeline.tsx`

The main timeline component that closely matches the design from the reference image. Features include:

- **Video Player Section**: Full-screen video preview area with overlay controls
- **Timeline Controls**: Play/pause, time display, zoom controls, volume, fullscreen
- **Time Ruler**: Precise time markers (0s, 2s, 4s, etc.) with red playhead indicator
- **Timeline Track**: Single track with video thumbnails and drag-and-drop functionality
- **Interactive Elements**: Clickable timeline, resizable clips, hover previews

#### Key Features:

- ✅ Video player with overlay controls
- ✅ Professional timeline with time markers
- ✅ Thumbnail previews in timeline clips
- ✅ Drag-and-drop resize handles
- ✅ Zoom controls with visual slider
- ✅ Play/pause controls
- ✅ Volume control
- ✅ Fullscreen toggle
- ✅ Add frame buttons (left and right)
- ✅ Hover tooltips with frame previews
- ✅ AI-powered audio generation via ElevenLabs (voice-over) and Suno (background music)

### 2. MultiTrackTimelineEditor

**File:** `src/components/storyboard/MultiTrackTimelineEditor.tsx`

An advanced multi-track timeline editor with separate tracks for different media types:

- **Video Track**: Main video content with thumbnails
- **Audio Track**: Background music and sound effects
- **Voice Over Track**: Narration and dialogue
- **Text Track**: Subtitles and on-screen text

#### Key Features:

- ✅ Multiple synchronized tracks
- ✅ Track-specific media types
- ✅ Color-coded track indicators
- ✅ Independent track controls
- ✅ Cross-track synchronization

### 3. VideoTimelineEditor

**File:** `src/components/storyboard/VideoTimelineEditor.tsx`

A simplified timeline editor focused on video content with basic editing capabilities.

## Usage Examples

### Basic Implementation

```tsx
import ProfessionalVideoTimeline from '@/components/storyboard/ProfessionalVideoTimeline'
import { StoryboardFrame } from '@/types/storyboard'

const MyTimelineComponent = () => {
  const [frames, setFrames] = useState<StoryboardFrame[]>([])

  const handleUpdateFrame = (frameId: string, updates: Partial<StoryboardFrame>) => {
    setFrames(prev => prev.map(frame => (frame.id === frameId ? { ...frame, ...updates } : frame)))
  }

  const handleSave = () => {
    console.log('Saving timeline...', frames)
  }

  const handleAddFrame = () => {
    // Add new frame logic
  }

  return (
    <div className="h-screen">
      <ProfessionalVideoTimeline
        frames={frames}
        onUpdateFrame={handleUpdateFrame}
        onSave={handleSave}
        onAddFrame={handleAddFrame}
        projectId="my-project-id"
      />
    </div>
  )
}
```

### Demo Page

Visit `/timeline-demo` to see the timeline component in action with sample data.

## Design Features

### Visual Design

- **Dark Theme**: Professional dark interface (neutral-950 background)
- **Color Coding**: Blue for video, green for audio, purple for voice-over
- **Typography**: Monospace fonts for time displays
- **Icons**: Lucide React icons for consistent UI
- **Shadows**: Subtle shadows for depth and hierarchy

### Interactive Elements

- **Drag & Drop**: Resize clips by dragging handles
- **Click to Seek**: Click timeline to jump to specific time
- **Hover Previews**: Hover over clips to see larger previews
- **Keyboard Shortcuts**: Space for play/pause (can be added)

### Responsive Design

- **Flexible Layout**: Adapts to different screen sizes
- **Touch Support**: Works on touch devices
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Data Structure

The timeline components work with the `StoryboardFrame` interface:

```typescript
interface StoryboardFrame {
  id: string
  imageUrl?: string
  scene: number
  shotDescription: string
  shot: string
  dialogue: string
  sound: string
  status: 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error'
  duration?: number // Duration in seconds
  audioUrl?: string // Background music/sound URL
  voiceOverUrl?: string // Voice-over audio URL
  voiceOverText?: string // Voice-over script text
  startTime?: number // Start time in timeline (seconds)
}
```

## Customization

### Styling

The components use Tailwind CSS classes and can be customized by:

- Modifying color schemes in the component files
- Adjusting spacing and sizing
- Adding custom CSS classes

### Functionality

- Add new track types by extending the `Track` interface
- Implement custom drag-and-drop behaviors
- Add keyboard shortcuts for common actions
- Integrate with video playback libraries

## Integration

### AI Audio Providers

The timeline sidebar can generate voice-overs (ElevenLabs) and background music (Suno). Configure the following environment variables to enable these services:

- `ELEVENLABS_API_KEY` – ElevenLabs API key
- `ELEVENLABS_VOICE_ID` – Default voice ID to synthesize narration
- `ELEVENLABS_MODEL_ID` *(optional)* – Override the voice model (defaults to `eleven_monolingual_v1`)
- `ELEVENLABS_VOICE_STABILITY` *(optional)* – Float value for stability (defaults to `0.6`)
- `ELEVENLABS_VOICE_SIMILARITY` *(optional)* – Float value for similarity boost (defaults to `0.75`)
- `ELEVENLABS_VOICE_STYLE` *(optional)* – Float value for style intensity
- `SUNO_API_KEY` – Suno API token
- `SUNO_MODEL_ID` *(optional)* – Music generation model, defaults to `chirp-v3-5`
- `SUNO_DEFAULT_TAGS` *(optional)* – Comma-separated tags passed to Suno

Both providers upload generated audio to your configured R2 bucket via the existing `R2_BUCKET_NAME` settings. Ensure the timeline component receives a `projectId` prop so generated assets can be organized per project.

### With Existing Storyboard System

The timeline components integrate seamlessly with the existing storyboard system:

- Uses existing `StoryboardFrame` types
- Compatible with current frame update mechanisms
- Works with existing image and audio handling

### With Video Playback

For full video playback integration:

- Connect to video.js or similar libraries
- Implement frame-accurate seeking
- Add audio waveform visualization
- Support for multiple video formats

## Performance Considerations

- **Virtual Scrolling**: For large timelines with many frames
- **Lazy Loading**: Load thumbnails on demand
- **Debounced Updates**: Prevent excessive re-renders during dragging
- **Memory Management**: Clean up object URLs for uploaded files

## Future Enhancements

- **Multi-Selection**: Select and edit multiple clips
- **Undo/Redo**: History management for timeline changes
- **Export Options**: Export timeline as video or project file
- **Collaboration**: Real-time collaborative editing
- **Templates**: Pre-built timeline templates
- **Effects**: Add transitions and effects between clips

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Features**: Requires ES6+ support for drag-and-drop and modern CSS

## Dependencies

- React 18+
- Tailwind CSS
- Lucide React (for icons)
- TypeScript (for type safety)

## Testing

The components include basic test files:

- `ProfessionalTimelineEditor.test.tsx`
- `TimelineEditor.test.tsx`

Run tests with:

```bash
npm test
```

## Contributing

When adding new features:

1. Follow the existing code style
2. Add TypeScript types for new interfaces
3. Include tests for new functionality
4. Update this documentation
5. Ensure accessibility compliance
