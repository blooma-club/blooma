'use client'
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { StoryboardFrame } from '@/types/storyboard'
import {
  Play,
  Pause,
  Upload,
  Volume2,
  Mic,
  Clock,
  X,
  Image,
  Settings,
  Film,
  Square,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface ProfessionalTimelineEditorProps {
  frames: StoryboardFrame[]
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  onSave?: () => void
}

interface TimelineClip {
  frame: StoryboardFrame
  startTime: number
  duration: number
  widthPercent: number
  leftPercent: number
}

interface ElevenLabsVoiceOption {
  id: string
  name: string
  category?: string
  labels?: Record<string, string>
  previewUrl?: string
}

export const ProfessionalTimelineEditor: React.FC<ProfessionalTimelineEditorProps> = ({
  frames,
  onUpdateFrame,
  onSave,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime] = useState(0)
  const [hoveredFrame, setHoveredFrame] = useState<StoryboardFrame | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<{
    frameId: string
    type: 'move' | 'resize-left' | 'resize-right'
    startX: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [voiceOptions, setVoiceOptions] = useState<ElevenLabsVoiceOption[]>([])
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
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
      // Note: For move, we'd need to reorder frames which is more complex
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

  useEffect(() => {
    let isMounted = true

    const loadVoices = async () => {
      setIsLoadingVoices(true)
      setVoiceLoadError(null)

      try {
        const response = await fetch('/api/audio/voices')
        const payload = (await response.json().catch(() => ({}))) as {
          voices?: ElevenLabsVoiceOption[]
          defaultVoiceId?: string | null
          error?: string
          warning?: string
        }

        const resolvedVoices = Array.isArray(payload.voices) ? payload.voices : []
        const resolvedDefaultVoiceId =
          typeof payload.defaultVoiceId === 'string' && payload.defaultVoiceId.length > 0
            ? payload.defaultVoiceId
            : null

        if (!isMounted) return

        if (!response.ok) {
          setVoiceOptions(resolvedVoices)
          setDefaultVoiceId(resolvedDefaultVoiceId)
          setVoiceLoadError(payload.error || payload.warning || 'Failed to load ElevenLabs voices')
          return
        }

        setVoiceOptions(resolvedVoices)
        setDefaultVoiceId(resolvedDefaultVoiceId)
        setVoiceLoadError(payload.warning || null)
      } catch (error) {
        if (!isMounted) return
        console.error('Failed to load ElevenLabs voices:', error)
        setVoiceOptions([])
        setDefaultVoiceId(null)
        setVoiceLoadError((error as Error).message || 'Failed to load voices')
      } finally {
        if (isMounted) {
          setIsLoadingVoices(false)
        }
      }
    }

    loadVoices()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAudioUpload = useCallback(
    async (frameId: string, file: File, type: 'audio' | 'voiceOver') => {
      const url = URL.createObjectURL(file)
      const updateKey = type === 'audio' ? 'audioUrl' : 'voiceOverUrl'

      // Update local state immediately for UI responsiveness
      onUpdateFrame(frameId, { [updateKey]: url })

      // Save to database
      try {
        const response = await fetch('/api/timeline', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameId,
            [type === 'audio' ? 'audioUrl' : 'voiceOverUrl']: url,
          }),
        })

        if (!response.ok) {
          console.error('Failed to save audio URL to database')
        }
      } catch (error) {
        console.error('Error saving audio URL:', error)
      }
    },
    [onUpdateFrame]
  )

  const handleVoiceOverTextChange = useCallback(
    async (frameId: string, text: string) => {
      // Update local state immediately for UI responsiveness
      onUpdateFrame(frameId, { voiceOverText: text })

      // Debounced save to database (save after user stops typing)
      setTimeout(async () => {
        try {
          const response = await fetch('/api/timeline', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frameId, voiceOverText: text }),
          })

          if (!response.ok) {
            console.error('Failed to save voice-over text to database')
          }
        } catch (error) {
          console.error('Error saving voice-over text:', error)
        }
      }, 1000) // Save 1 second after user stops typing
    },
    [onUpdateFrame]
  )

  const handleVoiceSelectionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedFrame) return

      const value = event.target.value
      onUpdateFrame(selectedFrame.id, { voiceOverVoiceId: value || undefined })
    },
    [selectedFrame, onUpdateFrame]
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

  const defaultVoiceOption = defaultVoiceId
    ? voiceOptions.find(voice => voice.id === defaultVoiceId)
    : undefined

  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Timeline Header */}
      <div className="border-b border-neutral-700 bg-neutral-900 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Professional Timeline</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-neutral-300">
                <span className="text-neutral-500">Duration:</span> {formatTime(totalDuration)}
              </div>
              <div className="text-neutral-300">
                <span className="text-neutral-500">Scenes:</span> {frames.length}
              </div>
              <div className="text-neutral-300">
                <span className="text-neutral-500">Zoom:</span> {Math.round(zoom * 100)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
                className="p-1 hover:bg-neutral-700 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(zoom + 0.2)}
                className="p-1 hover:bg-neutral-700 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-neutral-800 rounded">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="p-2 hover:bg-neutral-800 rounded">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                Save Timeline
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Timeline Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'mr-4' : ''}`}
        >
          {/* Timeline Ruler */}
          <div className="border-b border-neutral-700 px-4 py-3 bg-neutral-900">
            <div className="relative h-8" ref={timelineRef}>
              {/* Time markers */}
              {Array.from({ length: Math.ceil(scaledDuration / 5) + 1 }, (_, i) => i * 5).map(
                seconds => (
                  <div
                    key={seconds}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${(seconds / scaledDuration) * 100}%` }}
                  >
                    <div className="w-px h-5 bg-neutral-500"></div>
                    <div className="text-xs text-neutral-400 mt-1 font-mono">
                      {formatTime(seconds)}
                    </div>
                  </div>
                )
              )}

              {/* Current time indicator */}
              <div
                className="absolute top-0 w-0.5 h-8 bg-red-500 z-20 shadow-lg"
                style={{ left: `${(currentTime / scaledDuration) * 100}%` }}
              >
                <div className="w-4 h-4 bg-red-500 -ml-1.5 -mt-1 rounded-full shadow-lg border-2 border-white"></div>
              </div>
            </div>
          </div>

          {/* Timeline Tracks */}
          <div className="flex-1 overflow-auto bg-neutral-950">
            <div className="p-4 space-y-4">
              {/* Track Labels */}
              <div className="flex">
                <div className="w-32 pr-4 space-y-6 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 h-20">
                    <Image className="w-4 h-4" />
                    Video
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 h-16">
                    <Volume2 className="w-4 h-4" />
                    Audio
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-300 h-16">
                    <Mic className="w-4 h-4" />
                    Voice Over
                  </div>
                </div>

                {/* Tracks Content */}
                <div className="flex-1 space-y-6">
                  {/* Video Track */}
                  <div className="relative h-20 bg-neutral-800 rounded border border-neutral-600 shadow-inner">
                    {timelineClips.map(clip => (
                      <div
                        key={clip.frame.id}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer border-2 transition-all overflow-hidden group ${
                          selectedFrameId === clip.frame.id
                            ? 'border-blue-400 bg-blue-500/30 shadow-lg shadow-blue-500/20'
                            : 'border-neutral-500 bg-neutral-700 hover:border-neutral-400 hover:bg-neutral-600'
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
                            <div className="text-xs text-blue-400 font-mono">
                              {clip.duration.toFixed(1)}s
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Audio Track */}
                  <div className="relative h-16 bg-neutral-800 rounded border border-neutral-600 shadow-inner">
                    {timelineClips.map(
                      clip =>
                        clip.frame.audioUrl && (
                          <div
                            key={`audio-${clip.frame.id}`}
                            className="absolute top-1 bottom-1 bg-green-600/40 border border-green-500 rounded overflow-hidden"
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
                    )}
                  </div>

                  {/* Voice Over Track */}
                  <div className="relative h-16 bg-neutral-800 rounded border border-neutral-600 shadow-inner">
                    {timelineClips.map(
                      clip =>
                        (clip.frame.voiceOverUrl || clip.frame.voiceOverText) && (
                          <div
                            key={`voice-${clip.frame.id}`}
                            className="absolute top-1 bottom-1 bg-purple-600/40 border border-purple-500 rounded overflow-hidden"
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
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Sidebar */}
        <div
          className={`border-l border-neutral-700 bg-neutral-900 transition-all duration-300 ${
            sidebarCollapsed ? 'w-12' : 'w-80'
          } flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-neutral-700 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Properties
              </h4>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-neutral-800 rounded"
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Properties Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-auto p-4">
              {selectedFrame ? (
                <div className="space-y-6">
                  {/* Frame Preview */}
                  <div>
                    <h5 className="text-sm font-semibold mb-3 text-neutral-200">
                      Scene {selectedFrame.scene}
                    </h5>
                    {selectedFrame.imageUrl ? (
                      <div className="mb-4">
                        <img
                          src={selectedFrame.imageUrl}
                          alt={`Scene ${selectedFrame.scene} preview`}
                          className="w-full h-32 object-cover rounded-lg border border-neutral-700"
                        />
                      </div>
                    ) : (
                      <div className="mb-4 w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center">
                        <div className="text-center text-neutral-500">
                          <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-xs">No Image</div>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-neutral-400">{selectedFrame.shotDescription}</p>
                  </div>

                  {/* Duration Control */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.5"
                        max="30"
                        step="0.1"
                        value={selectedFrame.duration || 3}
                        onChange={e =>
                          onUpdateFrame(selectedFrame.id, { duration: parseFloat(e.target.value) })
                        }
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={selectedFrame.duration || 3}
                        onChange={e =>
                          onUpdateFrame(selectedFrame.id, { duration: parseFloat(e.target.value) })
                        }
                        className="w-16 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs"
                      />
                      <span className="text-xs text-neutral-400">s</span>
                    </div>
                  </div>

                  {/* Background Audio */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Volume2 className="w-4 h-4" />
                      Background Audio
                    </label>
                    {selectedFrame.audioUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded">
                          <Volume2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm flex-1">Audio attached</span>
                          <button
                            onClick={() => onUpdateFrame(selectedFrame.id, { audioUrl: undefined })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <audio controls className="w-full h-8" src={selectedFrame.audioUrl} />
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-600 rounded hover:border-neutral-500 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Audio
                      </button>
                    )}
                  </div>

                  {/* Voice Over */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Mic className="w-4 h-4" />
                      Voice Over
                    </label>

                    <div className="space-y-2">
                      <textarea
                        value={selectedFrame.voiceOverText || ''}
                        onChange={e => handleVoiceOverTextChange(selectedFrame.id, e.target.value)}
                        placeholder="Enter voice-over script..."
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white resize-none text-sm"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-neutral-400">
                        ElevenLabs Voice
                      </label>
                      <select
                        value={selectedFrame.voiceOverVoiceId || ''}
                        onChange={handleVoiceSelectionChange}
                        disabled={isLoadingVoices}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:border-neutral-500 disabled:opacity-80"
                      >
                        <option value="">
                          {defaultVoiceOption
                            ? `Use default (${defaultVoiceOption.name})`
                            : 'Use project default voice'}
                        </option>
                        {voiceOptions.map(voice => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name}
                            {voice.id === defaultVoiceId
                              ? ' (Default)'
                              : voice.category
                                ? ` – ${voice.category}`
                                : ''}
                          </option>
                        ))}
                      </select>
                      {isLoadingVoices ? (
                        <p className="text-xs text-neutral-500">Loading voices…</p>
                      ) : voiceLoadError ? (
                        <p className="text-xs text-red-400">{voiceLoadError}</p>
                      ) : (
                        <p className="text-xs text-neutral-500">
                          {voiceOptions.length > 0
                            ? 'Selecting a voice overrides the project default.'
                            : 'No ElevenLabs voices returned. The project default will be used.'}
                        </p>
                      )}
                    </div>

                    {selectedFrame.voiceOverUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded">
                          <Mic className="w-4 h-4 text-purple-400" />
                          <span className="text-sm flex-1">Voice-over attached</span>
                          <button
                            onClick={() =>
                              onUpdateFrame(selectedFrame.id, { voiceOverUrl: undefined })
                            }
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <audio controls className="w-full h-8" src={selectedFrame.voiceOverUrl} />
                      </div>
                    ) : (
                      <button
                        onClick={() => voiceInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-600 rounded hover:border-neutral-500 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Voice Over
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-neutral-500 mt-8">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a scene on the timeline to edit its properties</p>
                </div>
              )}
            </div>
          )}
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

export default ProfessionalTimelineEditor
