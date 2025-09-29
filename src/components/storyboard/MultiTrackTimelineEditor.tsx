'use client'
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { StoryboardFrame } from '@/types/storyboard'
import {
  Play,
  Pause,
  Volume2,
  Mic,
  Clock,
  Plus,
  X,
  Image,
  Settings,
  Film,
  Square,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Upload,
  Video,
  Music,
  Type,
} from 'lucide-react'

interface MultiTrackTimelineEditorProps {
  frames: StoryboardFrame[]
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  onSave?: () => void
  onAddFrame?: (insertIndex?: number) => void
}

interface TimelineClip {
  frame: StoryboardFrame
  startTime: number
  duration: number
  widthPercent: number
  leftPercent: number
}

interface Track {
  id: string
  name: string
  icon: React.ReactNode
  height: number
  color: string
  clips: TimelineClip[]
}

export const MultiTrackTimelineEditor: React.FC<MultiTrackTimelineEditorProps> = ({
  frames,
  onUpdateFrame,
  onSave,
  onAddFrame,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [hoveredFrame, setHoveredFrame] = useState<StoryboardFrame | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<{
    frameId: string
    type: 'move' | 'resize-left' | 'resize-right'
    startX: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [volume, setVolume] = useState(0.8)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<string>('video')

  const timelineRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)

  // Calculate total timeline duration
  const totalDuration = frames.reduce((acc, frame) => acc + (frame.duration || 3), 0)
  const scaledDuration = Math.max(totalDuration * zoom, 60) // Minimum 60 seconds view

  // Calculate frame positions with zoom
  const timelineClips: TimelineClip[] = frames.map((frame, index) => {
    const startTime = frames.slice(0, index).reduce((acc, f) => acc + (f.duration || 3), 0)
    const duration = frame.duration || 3
    return {
      frame,
      startTime,
      duration,
      widthPercent: (duration / scaledDuration) * 100,
      leftPercent: (startTime / scaledDuration) * 100,
    }
  })

  // Define tracks
  const tracks: Track[] = [
    {
      id: 'video',
      name: 'Video',
      icon: <Video className="w-4 h-4" />,
      height: 80,
      color: 'bg-blue-600/40 border-blue-500',
      clips: timelineClips,
    },
    {
      id: 'audio',
      name: 'Audio',
      icon: <Volume2 className="w-4 h-4" />,
      height: 60,
      color: 'bg-green-600/40 border-green-500',
      clips: timelineClips.filter(clip => clip.frame.audioUrl),
    },
    {
      id: 'voiceover',
      name: 'Voice Over',
      icon: <Mic className="w-4 h-4" />,
      height: 60,
      color: 'bg-purple-600/40 border-purple-500',
      clips: timelineClips.filter(clip => clip.frame.voiceOverUrl || clip.frame.voiceOverText),
    },
    {
      id: 'text',
      name: 'Text/Subtitles',
      icon: <Type className="w-4 h-4" />,
      height: 50,
      color: 'bg-yellow-600/40 border-yellow-500',
      clips: timelineClips.filter(clip => clip.frame.dialogue),
    },
  ]

  const selectedFrame = frames.find(f => f.id === selectedFrameId)

  // Handle dragging logic
  const handleMouseDown = useCallback(
    (frameId: string, type: 'move' | 'resize-left' | 'resize-right', e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging({ frameId, type, startX: e.clientX })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const deltaX = e.clientX - isDragging.startX
      const deltaTime = (deltaX / rect.width) * scaledDuration

      const frame = frames.find(f => f.id === isDragging.frameId)
      if (!frame) return

      if (isDragging.type === 'resize-right') {
        const newDuration = Math.max(0.5, (frame.duration || 3) + deltaTime)
        onUpdateFrame(frame.id, { duration: newDuration })
      } else if (isDragging.type === 'resize-left') {
        const newDuration = Math.max(0.5, (frame.duration || 3) - deltaTime)
        onUpdateFrame(frame.id, { duration: newDuration })
      }
    },
    [isDragging, scaledDuration, frames, onUpdateFrame]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleAudioUpload = useCallback(
    async (frameId: string, file: File, type: 'audio' | 'voiceOver') => {
      const url = URL.createObjectURL(file)
      const updateKey = type === 'audio' ? 'audioUrl' : 'voiceOverUrl'
      onUpdateFrame(frameId, { [updateKey]: url })
    },
    [onUpdateFrame]
  )

  const handleVoiceOverTextChange = useCallback(
    (frameId: string, text: string) => {
      onUpdateFrame(frameId, { voiceOverText: text })
    },
    [onUpdateFrame]
  )

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handleFrameMouseEnter = useCallback((frame: StoryboardFrame, event: React.MouseEvent) => {
    setHoveredFrame(frame)
    setMousePosition({ x: event.clientX, y: event.clientY })
  }, [])

  const handleFrameMouseLeave = useCallback(() => {
    setHoveredFrame(null)
  }, [])

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const newTime = (clickX / rect.width) * scaledDuration
      setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)))
    },
    [scaledDuration, totalDuration]
  )

  const renderClip = (clip: TimelineClip, trackId: string) => {
    const isSelected = selectedFrameId === clip.frame.id
    const baseClasses = `absolute top-1 bottom-1 rounded cursor-pointer border-2 transition-all overflow-hidden group ${
      isSelected
        ? 'border-blue-400 bg-blue-500/30 shadow-lg shadow-blue-500/20'
        : 'border-neutral-500 bg-neutral-700 hover:border-neutral-400 hover:bg-neutral-600'
    }`

    switch (trackId) {
      case 'video':
        return (
          <div
            key={clip.frame.id}
            className={baseClasses}
            style={{
              left: `${clip.leftPercent}%`,
              width: `${clip.widthPercent}%`,
            }}
            onClick={() => setSelectedFrameId(clip.frame.id)}
            onMouseEnter={e => handleFrameMouseEnter(clip.frame, e)}
            onMouseLeave={handleFrameMouseLeave}
          >
            {/* Resize handles */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={e => handleMouseDown(clip.frame.id, 'resize-left', e)}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={e => handleMouseDown(clip.frame.id, 'resize-right', e)}
            />

            <div className="h-full flex shadow-lg">
              {/* Thumbnail */}
              {clip.frame.imageUrl ? (
                <div className="flex-shrink-0 w-16 h-full bg-black rounded-sm overflow-hidden border-r border-neutral-600">
                  <img
                    src={clip.frame.imageUrl}
                    alt={`Scene ${clip.frame.scene}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-full bg-neutral-900 rounded-sm flex items-center justify-center border-r border-neutral-600">
                  <Square className="w-3 h-3 text-neutral-500" />
                </div>
              )}

              {/* Clip info */}
              <div className="flex-1 p-2 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  Scene {clip.frame.scene}
                </div>
                <div className="text-xs text-neutral-300 truncate">
                  {clip.frame.shotDescription.slice(0, 20)}...
                </div>
                <div className="text-xs text-blue-400 font-mono">{clip.duration.toFixed(1)}s</div>
              </div>
            </div>
          </div>
        )

      case 'audio':
        return (
          <div
            key={`audio-${clip.frame.id}`}
            className={`absolute top-1 bottom-1 bg-green-600/40 border border-green-500 rounded overflow-hidden ${baseClasses}`}
            style={{
              left: `${clip.leftPercent}%`,
              width: `${clip.widthPercent}%`,
            }}
          >
            <div className="p-2 h-full flex items-center">
              <Volume2 className="w-3 h-3 text-green-400 mr-2" />
              <div className="flex-1 h-2 bg-green-500/30 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-green-400 to-green-600 animate-pulse" />
              </div>
            </div>
          </div>
        )

      case 'voiceover':
        return (
          <div
            key={`voice-${clip.frame.id}`}
            className={`absolute top-1 bottom-1 bg-purple-600/40 border border-purple-500 rounded overflow-hidden ${baseClasses}`}
            style={{
              left: `${clip.leftPercent}%`,
              width: `${clip.widthPercent}%`,
            }}
          >
            <div className="p-2 h-full flex items-center">
              <Mic className="w-3 h-3 text-purple-400 mr-2" />
              <div className="flex-1 text-xs text-purple-200 truncate">
                {clip.frame.voiceOverText || 'Voice Over'}
              </div>
            </div>
          </div>
        )

      case 'text':
        return (
          <div
            key={`text-${clip.frame.id}`}
            className={`absolute top-1 bottom-1 bg-yellow-600/40 border border-yellow-500 rounded overflow-hidden ${baseClasses}`}
            style={{
              left: `${clip.leftPercent}%`,
              width: `${clip.widthPercent}%`,
            }}
          >
            <div className="p-2 h-full flex items-center">
              <Type className="w-3 h-3 text-yellow-400 mr-2" />
              <div className="flex-1 text-xs text-yellow-200 truncate">
                {clip.frame.dialogue || 'Dialogue'}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Video Player Section */}
      <div className="flex-1 bg-black relative overflow-hidden">
        {selectedFrame?.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={selectedFrame.imageUrl}
              alt={`Scene ${selectedFrame.scene}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <div className="text-center text-neutral-500">
              <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a scene to preview</p>
            </div>
          </div>
        )}

        {/* Video Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <div className="text-white font-mono text-lg">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  className="w-20"
                />
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-neutral-900 border-t border-neutral-700">
        {/* Timeline Controls */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onAddFrame?.()}
              className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
                className="p-1 hover:bg-neutral-800 rounded"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-32 h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${((zoom - 0.1) / 2.9) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                className="p-1 hover:bg-neutral-800 rounded"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-neutral-200 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-black" />
              ) : (
                <Play className="w-4 h-4 text-black" />
              )}
            </button>
            <div className="text-white font-mono">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16"
              />
            </div>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-neutral-800 rounded transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onAddFrame?.()}
              className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Timeline Ruler */}
        <div className="px-4 py-3 border-b border-neutral-700">
          <div className="relative h-8" ref={timelineRef} onClick={handleTimelineClick}>
            {/* Time markers */}
            {Array.from({ length: Math.ceil(scaledDuration / 2) + 1 }, (_, i) => i * 2).map(
              seconds => (
                <div
                  key={seconds}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(seconds / scaledDuration) * 100}%` }}
                >
                  <div className="w-px h-5 bg-neutral-500"></div>
                  <div className="text-xs text-neutral-400 mt-1 font-mono">{seconds}s</div>
                </div>
              )
            )}

            {/* Current time indicator */}
            <div
              className="absolute top-0 w-0.5 h-8 bg-red-500 z-20 shadow-lg cursor-pointer"
              style={{ left: `${(currentTime / scaledDuration) * 100}%` }}
            >
              <div className="w-4 h-4 bg-red-500 -ml-1.5 -mt-1 rounded-full shadow-lg border-2 border-white"></div>
            </div>
          </div>
        </div>

        {/* Multi-Track Timeline */}
        <div className="p-4">
          <div className="flex">
            {/* Track Labels */}
            <div className="w-32 pr-4 space-y-2">
              {tracks.map(track => (
                <div
                  key={track.id}
                  className={`flex items-center gap-2 text-sm font-medium text-neutral-300 h-${track.height / 4} cursor-pointer hover:text-white transition-colors ${
                    selectedTrack === track.id ? 'text-white' : ''
                  }`}
                  onClick={() => setSelectedTrack(track.id)}
                >
                  {track.icon}
                  {track.name}
                </div>
              ))}
            </div>

            {/* Tracks Content */}
            <div className="flex-1 space-y-2">
              {tracks.map(track => (
                <div
                  key={track.id}
                  className={`relative bg-neutral-800 rounded border border-neutral-600 shadow-inner`}
                  style={{ height: `${track.height}px` }}
                >
                  {track.clips.map(clip => renderClip(clip, track.id))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && selectedFrame) handleAudioUpload(selectedFrame.id, file, 'audio')
        }}
      />
      <input
        ref={voiceInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && selectedFrame) handleAudioUpload(selectedFrame.id, file, 'voiceOver')
        }}
      />

      {/* Image Preview Tooltip */}
      {hoveredFrame && hoveredFrame.imageUrl && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 20,
            top: mousePosition.y - 120,
          }}
        >
          <div className="bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl p-2 max-w-xs">
            <img
              src={hoveredFrame.imageUrl}
              alt={`Scene ${hoveredFrame.scene} preview tooltip`}
              className="w-48 h-32 object-cover rounded mb-2"
            />
            <div className="text-xs text-white">
              <div className="font-medium mb-1">Scene {hoveredFrame.scene}</div>
              <div className="text-neutral-300 truncate">{hoveredFrame.shotDescription}</div>
              <div className="text-neutral-400 mt-1">
                Duration: {(hoveredFrame.duration || 3).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiTrackTimelineEditor
