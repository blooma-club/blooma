# How to Access the Professional Video Timeline

The professional video timeline component is now integrated into your existing storyboard system. Here's how to access it:

## 🎬 Accessing the Timeline

### Method 1: Through Existing Storyboard Page

1. Navigate to any project's storyboard page:

   ```
   http://localhost:3000/project/[PROJECT_ID]/storyboard/[STORYBOARD_ID]
   ```

2. Look for the **Timeline** button in the navigation header
3. Click on **Timeline** to switch to timeline view
4. The URL will update to include `?view=timeline`

### Method 2: Direct URL Access

You can also access the timeline directly by adding `?view=timeline` to your storyboard URL:

```
http://localhost:3000/project/[PROJECT_ID]/storyboard/[STORYBOARD_ID]?view=timeline
```

## 🎯 Example URLs

For your specific project:

```
http://localhost:3000/project/306b2cf5-c1f0-48ed-9c98-7ad32f846051/storyboard/306b2cf5-c1f0-48ed-9c98-7ad32f846051?view=timeline
```

## ✨ Timeline Features

Once in timeline view, you'll have access to:

- **Video Player**: Full-screen preview of selected scenes
- **Professional Timeline**: Time markers (0s, 2s, 4s, etc.) with red playhead
- **Thumbnail Clips**: Visual representation of each scene
- **Drag & Drop**: Resize clips by dragging the handles
- **Playback Controls**: Play/pause, time display, volume control
- **Zoom Controls**: Zoom in/out on the timeline
- **Add Frame Buttons**: Plus buttons to add new scenes
- **Hover Previews**: Hover over clips to see larger previews

## 🔧 Navigation

The timeline integrates seamlessly with your existing storyboard navigation:

- **Storyboard View**: Grid/list view of all scenes
- **Editor View**: Single frame editing mode
- **Timeline View**: Professional video timeline (NEW!)

## 💾 Saving Changes

- Timeline changes are automatically saved to the database
- Use the **Save Timeline** button to persist all changes
- Frame durations, audio, and voice-over data are preserved

## 🎨 Customization

The timeline uses your existing storyboard data:

- Scene images from your generated storyboards
- Scene descriptions and metadata
- Audio and voice-over files (when uploaded)

## 🚀 Getting Started

1. **Create a Storyboard**: First, create some scenes in your project
2. **Switch to Timeline**: Use the Timeline button in the navigation
3. **Edit Scenes**: Click on timeline clips to select and edit them
4. **Adjust Duration**: Drag the resize handles to change scene duration
5. **Add Audio**: Upload background music or voice-over files
6. **Save Changes**: Use the Save Timeline button to persist changes

## 🔍 Troubleshooting

If you don't see the Timeline button:

1. Make sure you have scenes in your storyboard
2. Check that you're on the correct project/storyboard page
3. Refresh the page if the navigation doesn't appear

The timeline component is now fully integrated and ready to use! 🎬
