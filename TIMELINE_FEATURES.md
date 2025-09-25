# Professional Timeline Editor

The Professional Timeline Editor provides a Premiere Pro-style timeline interface for advanced storyboard editing with precise timing control and multi-track audio management.

## Key Features

### 🎬 Professional Timeline Layout

- **Multi-track interface** with separate video, audio, and voice-over tracks
- **Precision timeline ruler** with frame-accurate time markers
- **Draggable timeline clips** that can be resized by dragging edges
- **Zoom controls** for detailed editing (10% - 500%)
- **Visual waveform representation** for audio tracks

### 🎛️ Interactive Controls

- **Clip resizing**: Drag the left or right edges of clips to adjust duration
- **Frame selection**: Click any clip to select and edit its properties
- **Playback controls**: Play/pause with visual timeline scrubbing
- **Collapsible sidebar**: Toggle the properties panel for more workspace

### 📊 Properties Sidebar

- **Scene preview** with thumbnail and description
- **Duration controls** with both slider and numeric input
- **Background audio upload** with preview player
- **Voice-over script editor** with text-to-speech integration
- **Audio file management** with drag-and-drop support

### 🎵 Audio Management

- **Background music track** for ambient sounds and music
- **Voice-over track** for narration and dialogue
- **Visual audio indicators** showing which frames have audio
- **Audio preview controls** built into the properties panel

## Usage

### Accessing the Timeline

1. Navigate to any storyboard in your project
2. Click the "Timeline" tab in the floating header
3. The professional timeline will load with all your storyboard frames

### Editing Frame Duration

1. Select a frame by clicking on it in the timeline
2. Use the properties sidebar to adjust duration with:
   - Range slider for quick adjustments
   - Numeric input for precise values
3. Or drag the clip edges directly in the timeline

### Adding Audio

1. Select a frame in the timeline
2. In the properties sidebar:
   - **Background Audio**: Click "Upload Audio" to add music/sounds
   - **Voice Over**: Enter script text and/or upload audio file
3. Audio clips will appear in their respective tracks

### Timeline Navigation

- **Zoom**: Use +/- buttons or keyboard shortcuts to zoom in/out
- **Scrubbing**: Click anywhere on the timeline ruler to jump to that time
- **Playback**: Use play/pause controls to preview your storyboard

## Technical Implementation

The Professional Timeline Editor is built with:

- **React hooks** for state management
- **TypeScript** for type safety
- **Tailwind CSS** for responsive styling
- **Drag API** for interactive clip manipulation
- **Audio API** for media playback

## Keyboard Shortcuts

- `Space`: Play/Pause
- `+`: Zoom in
- `-`: Zoom out
- `←/→`: Navigate between frames
- `Delete`: Remove selected audio

## Tips for Best Results

1. **Frame Duration**: Keep individual frames between 2-8 seconds for optimal pacing
2. **Audio Sync**: Use the timeline ruler to align audio with visual cues
3. **Voice Over**: Write concise scripts that match your frame duration
4. **Background Music**: Choose audio that complements but doesn't overpower voice-over
5. **Zoom Level**: Use higher zoom levels for precise timing adjustments

## Troubleshooting

**Timeline not loading?**

- Ensure your storyboard has at least one frame
- Check browser console for any JavaScript errors

**Audio not playing?**

- Verify audio file format (MP3, WAV supported)
- Check browser audio permissions
- Try refreshing the page

**Drag operations not working?**

- Ensure you're clicking on the clip edges for resizing
- Try clicking and holding for a moment before dragging
- Check that your browser supports drag operations

---

_For additional support or feature requests, please contact the development team._
