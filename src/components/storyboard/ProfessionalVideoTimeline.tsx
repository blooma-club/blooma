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

interface ProfessionalVideoTimelineProps {
  frames: StoryboardFrame[]
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  onSave?: () => void
  onAddFrame?: () => void
}

interface TimelineClip {
  frame: StoryboardFrame
  startTime: number
  duration: number
  widthPercent: number
  leftPercent: number
}

export const ProfessionalVideoTimeline: React.FC<ProfessionalVideoTimelineProps> = ({
  frames,
  onUpdateFrame,
  onSave,
  onAddFrame,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(2.18) // Start at 2.18s like in the image
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

  const timelineRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  // Calculate total timeline duration (12.01s like in the image)
  const totalDuration = frames.reduce((acc, frame) => acc + (frame.duration || 3), 0) || 12.01
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

  const selectedFrame = frames.find(f => f.id === selectedFrameId)

  // Keep selected frame in sync with currentTime during playback or scrubbing
  useEffect(() => {
    let accumulated = 0
    let found: string | null = null
    for (let i = 0; i < frames.length; i++) {
      const duration = frames[i].duration || 3
      const start = accumulated
      const end = start + duration
      if (currentTime >= start && currentTime < end) {
        found = frames[i].id
        break
      }
      accumulated = end
    }
    // If at or beyond end, clear selection
    if (
      !found &&
      frames.length > 0 &&
      currentTime >= frames.reduce((a, f) => a + (f.duration || 3), 0)
    ) {
      found = frames[frames.length - 1].id
    }
    if (found && found !== selectedFrameId) setSelectedFrameId(found)
  }, [currentTime, frames, selectedFrameId])

  // Playback loop advancing currentTime like a video
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      lastTsRef.current = null
      return
    }

    const total = frames.reduce((acc, f) => acc + (f.duration || 3), 0) || 0
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const deltaSec = (ts - (lastTsRef.current as number)) / 1000
      lastTsRef.current = ts
      setCurrentTime(prev => {
        if (total <= 0) return prev
        const next = prev + deltaSec
        // Loop when reaching the end
        if (next >= total) return 0
        return next
      })
      rafIdRef.current = requestAnimationFrame(step)
    }
    rafIdRef.current = requestAnimationFrame(step)
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, frames])

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

  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Video Player Section - Matches the image layout */}
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
      </div>

      {/* Timeline Section - Matches the image design */}
      <div className="bg-neutral-800 border-t border-neutral-600">
        {/* Timeline Controls - Top row with add buttons and zoom */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-600">
          <div className="flex items-center gap-3">
            <button
              onClick={onAddFrame}
              className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
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
            <div className="text-white font-mono text-sm">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
            <div className="flex items-center gap-2">
              <ZoomOut className="w-4 h-4 text-neutral-400" />
              <div className="w-20 h-1 bg-neutral-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-200"
                  style={{ width: `${((zoom - 0.1) / 2.9) * 100}%` }}
                />
              </div>
              <ZoomIn className="w-4 h-4 text-neutral-400" />
            </div>
            <Volume2 className="w-4 h-4 text-neutral-400" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 hover:bg-neutral-700 rounded transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onAddFrame}
              className="flex items-center justify-center w-8 h-8 bg-white rounded-full hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Timeline Ruler - Time markers like in the image */}
        <div className="px-4 py-2 border-b border-neutral-600">
          <div className="relative h-6" ref={timelineRef} onClick={handleTimelineClick}>
            {/* Time markers - 0s, 2s, 4s, 6s, 8s, 10s, etc. */}
            {Array.from({ length: Math.ceil(scaledDuration / 2) + 1 }, (_, i) => i * 2).map(
              seconds => (
                <div
                  key={seconds}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(seconds / scaledDuration) * 100}%` }}
                >
                  <div className="w-px h-4 bg-neutral-500"></div>
                  <div className="text-xs text-neutral-400 mt-1 font-mono">{seconds}s</div>
                </div>
              )
            )}

            {/* Current time indicator - Red line with circle like in the image */}
            <div
              className="absolute top-0 w-0.5 h-6 bg-red-500 z-20 shadow-lg cursor-pointer"
              style={{ left: `${(currentTime / scaledDuration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 -ml-1 -mt-1 rounded-full shadow-lg border border-white"></div>
            </div>
          </div>
        </div>

        {/* Timeline Track - Single track with thumbnails like in the image */}
        <div className="p-4">
          <div className="relative h-20 bg-neutral-700 rounded border border-neutral-500 shadow-inner">
            {timelineClips.map(clip => (
              <div
                key={clip.frame.id}
                className={`absolute top-1 bottom-1 rounded cursor-pointer border-2 transition-all overflow-hidden group ${
                  selectedFrameId === clip.frame.id
                    ? 'border-blue-400 bg-blue-500/30 shadow-lg shadow-blue-500/20'
                    : 'border-neutral-500 bg-neutral-600 hover:border-neutral-400 hover:bg-neutral-500'
                }`}
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
                  {/* Thumbnail - Small preview like in the image */}
                  {clip.frame.imageUrl ? (
                    <div className="flex-shrink-0 w-16 h-full bg-black rounded-sm overflow-hidden border-r border-neutral-500">
                      <img
                        src={clip.frame.imageUrl}
                        alt={`Scene ${clip.frame.scene}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-full bg-neutral-800 rounded-sm flex items-center justify-center border-r border-neutral-500">
                      <Square className="w-3 h-3 text-neutral-500" />
                    </div>
                  )}

                  {/* Clip info - Minimal like in the image */}
                  <div className="flex-1 p-2 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      Scene {clip.frame.scene}
                    </div>
                    <div className="text-xs text-neutral-300 truncate">
                      {clip.frame.shotDescription.slice(0, 15)}...
                    </div>
                    <div className="text-xs text-blue-400 font-mono">
                      {clip.duration.toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

export default ProfessionalVideoTimeline
