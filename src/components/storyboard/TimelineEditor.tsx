'use client'
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import NextImage from 'next/image'
import { StoryboardFrame } from '@/types/storyboard'
import { Play, Pause, Upload, Volume2, Mic, Clock, X, Image as ImageIcon } from 'lucide-react'

interface TimelineEditorProps {
  frames: StoryboardFrame[]
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  onSave?: () => void
}

interface ElevenLabsVoiceOption {
  id: string
  name: string
  category?: string
  labels?: Record<string, string>
  previewUrl?: string
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  frames,
  onUpdateFrame,
  onSave,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [hoveredFrame, setHoveredFrame] = useState<StoryboardFrame | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [voiceOptions, setVoiceOptions] = useState<ElevenLabsVoiceOption[]>([])
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)

  // Calculate total timeline duration
  const totalDuration = frames.reduce((acc, frame) => acc + (frame.duration || 3), 0)

  // Calculate frame positions and start times
  const framesWithPositions = useMemo(
    () =>
      frames.map((frame, index) => {
        const startTime = frames.slice(0, index).reduce((acc, f) => acc + (f.duration || 3), 0)
        const duration = frame.duration || 3
        return {
          ...frame,
          startTime,
          duration,
          widthPercent: (duration / Math.max(totalDuration, 1)) * 100,
        }
      }),
    [frames, totalDuration]
  )

  const selectedFrame = frames.find(f => f.id === selectedFrameId)

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

  const handleDurationChange = useCallback(
    (frameId: string, newDuration: number) => {
      onUpdateFrame(frameId, { duration: Math.max(0.1, newDuration) })
    },
    [onUpdateFrame]
  )

  const handleAudioUpload = useCallback(
    (frameId: string, file: File, type: 'audio' | 'voiceOver') => {
      // In a real implementation, you would upload the file to your storage service
      // For now, we'll create a temporary URL
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

  const handleFrameMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY })
  }, [])

  const defaultVoiceOption = defaultVoiceId
    ? voiceOptions.find(voice => voice.id === defaultVoiceId)
    : undefined

  useEffect(() => {
    const activeFrame = framesWithPositions.find(frame => frame.id === selectedFrameId)
    if (activeFrame) {
      setCurrentTime(activeFrame.startTime)
    }
  }, [framesWithPositions, selectedFrameId])

  return (
    <div className="h-full bg-neutral-950 text-white flex flex-col">
      {/* Timeline Header */}
      <div className="border-b border-neutral-700 bg-neutral-900 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h3 className="text-xl font-semibold text-white">Timeline</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-neutral-300">
                <span className="text-neutral-500">Duration:</span> {formatTime(totalDuration)}
              </div>
              <div className="text-neutral-300">
                <span className="text-neutral-500">Scenes:</span> {frames.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
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

      {/* Timeline Ruler */}
      <div className="border-b border-neutral-700 px-4 py-3 bg-neutral-900">
        <div className="relative h-8">
          {/* Time markers */}
          {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${(i / Math.max(totalDuration, 1)) * 100}%` }}
            >
              <div className="w-px h-5 bg-neutral-500"></div>
              <div className="text-xs text-neutral-400 mt-1 font-mono">{formatTime(i)}</div>
            </div>
          ))}

          {/* Current time indicator */}
          <div
            className="absolute top-0 w-0.5 h-8 bg-red-500 z-10 shadow-lg"
            style={{ left: `${(currentTime / Math.max(totalDuration, 1)) * 100}%` }}
          >
            <div className="w-4 h-4 bg-red-500 -ml-1.5 -mt-1 rounded-full shadow-lg border-2 border-white"></div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Timeline Tracks */}
        <div className="flex-1 p-6 overflow-auto bg-neutral-950">
          <div className="space-y-6">
            {/* Frame Track */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                <ImageIcon className="w-4 h-4" />
                Video Track 1
              </div>
              <div className="relative h-24 bg-neutral-800 rounded-lg border border-neutral-600 shadow-inner">
                {framesWithPositions.map(frame => (
                  <div
                    key={frame.id}
                    className={`absolute top-1 bottom-1 rounded cursor-pointer border-2 transition-all overflow-hidden ${
                      selectedFrameId === frame.id
                        ? 'border-blue-500 bg-blue-600/30'
                        : 'border-neutral-600 bg-neutral-700 hover:border-neutral-500 hover:bg-neutral-600'
                    }`}
                    style={{
                      left: `${(frame.startTime / Math.max(totalDuration, 1)) * 100}%`,
                      width: `${frame.widthPercent}%`,
                    }}
                    onClick={() => setSelectedFrameId(frame.id)}
                    onMouseEnter={e => handleFrameMouseEnter(frame, e)}
                    onMouseLeave={handleFrameMouseLeave}
                    onMouseMove={handleFrameMouseMove}
                  >
                    <div className="h-full flex shadow-lg">
                      {/* Image thumbnail */}
                      {frame.imageUrl ? (
                        <div className="relative flex-shrink-0 w-20 h-full bg-black rounded-sm overflow-hidden border-r border-neutral-600">
                          <NextImage
                            src={frame.imageUrl}
                            alt={`Scene ${frame.scene}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-20 h-full bg-neutral-900 rounded-sm flex items-center justify-center border-r border-neutral-600">
                          <div className="text-center text-neutral-500">
                            <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                            <div className="text-xs">No Image</div>
                          </div>
                        </div>
                      )}

                      {/* Scene info */}
                      <div className="flex-1 p-2 min-w-0 bg-gradient-to-r from-transparent to-black/20">
                        <div className="text-xs font-semibold text-white mb-1">S{frame.scene}</div>
                        <div className="text-xs text-neutral-200 truncate leading-tight">
                          {frame.shotDescription.slice(0, 35)}...
                        </div>
                        <div className="text-xs text-blue-400 mt-1 font-mono">
                          {(frame.duration || 3).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audio Track */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                <Volume2 className="w-4 h-4" />
                Audio Track 1
              </div>
              <div className="relative h-16 bg-neutral-800 rounded-lg border border-neutral-600 shadow-inner">
                {framesWithPositions.map(
                  frame =>
                    frame.audioUrl && (
                      <div
                        key={`audio-${frame.id}`}
                        className="absolute top-1 bottom-1 bg-green-600/50 border border-green-500 rounded"
                        style={{
                          left: `${(frame.startTime / Math.max(totalDuration, 1)) * 100}%`,
                          width: `${frame.widthPercent}%`,
                        }}
                      >
                        <div className="p-1 h-full flex items-center">
                          <Volume2 className="w-3 h-3 text-green-400" />
                        </div>
                      </div>
                    )
                )}
              </div>
            </div>

            {/* Voice Over Track */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                <Mic className="w-4 h-4" />
                Voice Over Track
              </div>
              <div className="relative h-16 bg-neutral-800 rounded-lg border border-neutral-600 shadow-inner">
                {framesWithPositions.map(
                  frame =>
                    frame.voiceOverUrl && (
                      <div
                        key={`voice-${frame.id}`}
                        className="absolute top-1 bottom-1 bg-purple-600/50 border border-purple-500 rounded"
                        style={{
                          left: `${(frame.startTime / Math.max(totalDuration, 1)) * 100}%`,
                          width: `${frame.widthPercent}%`,
                        }}
                      >
                        <div className="p-1 h-full flex items-center">
                          <Mic className="w-3 h-3 text-purple-400" />
                        </div>
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 border-l border-neutral-700 bg-neutral-900 p-6 overflow-auto">
          {selectedFrame ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-4">
                  Scene {selectedFrame.scene} Properties
                </h4>

                {/* Frame Preview */}
                {selectedFrame.imageUrl ? (
                  <div className="mb-4">
                    <NextImage
                      src={selectedFrame.imageUrl}
                      alt={`Scene ${selectedFrame.scene}`}
                      width={288}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg border border-neutral-700"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="mb-4 w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center">
                    <div className="text-center text-neutral-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <div className="text-xs">No Image</div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-neutral-400 mb-4">{selectedFrame.shotDescription}</div>
              </div>

              {/* Duration Control */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={selectedFrame.duration || 3}
                  onChange={e => handleDurationChange(selectedFrame.id, parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
                />
              </div>

              {/* Background Audio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Volume2 className="w-4 h-4" />
                  Background Audio
                </label>
                {selectedFrame.audioUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded">
                    <Volume2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm flex-1">Audio file attached</span>
                    <button
                      onClick={() => onUpdateFrame(selectedFrame.id, { audioUrl: undefined })}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleAudioUpload(selectedFrame.id, file, 'audio')
                  }}
                />
              </div>

              {/* Voice Over */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="w-4 h-4" />
                  Voice Over
                </label>

                {/* Voice Over Text */}
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">Script</label>
                  <textarea
                    value={selectedFrame.voiceOverText || ''}
                    onChange={e => handleVoiceOverTextChange(selectedFrame.id, e.target.value)}
                    placeholder="Enter voice-over script..."
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">ElevenLabs Voice</label>
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

                {/* Voice Over Audio */}
                {selectedFrame.voiceOverUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded">
                    <Mic className="w-4 h-4 text-purple-400" />
                    <span className="text-sm flex-1">Voice-over file attached</span>
                    <button
                      onClick={() => onUpdateFrame(selectedFrame.id, { voiceOverUrl: undefined })}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
                <input
                  ref={voiceInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleAudioUpload(selectedFrame.id, file, 'voiceOver')
                  }}
                />
              </div>

              {/* Audio Preview */}
              {(selectedFrame.audioUrl || selectedFrame.voiceOverUrl) && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Audio Preview</h5>
                  {selectedFrame.audioUrl && (
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Background Audio</label>
                      <audio controls className="w-full" src={selectedFrame.audioUrl} />
                    </div>
                  )}
                  {selectedFrame.voiceOverUrl && (
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Voice Over</label>
                      <audio controls className="w-full" src={selectedFrame.voiceOverUrl} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-neutral-500 mt-8">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a scene on the timeline to edit its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" />
      <input ref={voiceInputRef} type="file" accept="audio/*" className="hidden" />

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
            <div className="relative w-48 h-32 rounded mb-2 overflow-hidden">
              <NextImage
                src={hoveredFrame.imageUrl}
                alt={`Scene ${hoveredFrame.scene} Preview`}
                fill
                className="object-cover"
                sizes="192px"
                unoptimized
              />
            </div>
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

export default TimelineEditor
