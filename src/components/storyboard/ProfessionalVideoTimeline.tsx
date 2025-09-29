'use client'
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { StoryboardFrame } from '@/types/storyboard'
import {
  Play,
  Pause,
  Volume2,
  Mic,
  Clock,
  Plus,
  Settings,
  Film,
  Square,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Upload,
  Link2,
  Music,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface ProfessionalVideoTimelineProps {
  frames: StoryboardFrame[]
  onUpdateFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  onSave?: () => void
  onAddFrame?: (insertIndex?: number) => void
  projectId?: string
  onGenerateScene?: (prompt: string) => Promise<void>
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

export const ProfessionalVideoTimeline: React.FC<ProfessionalVideoTimelineProps> = ({
  frames,
  onUpdateFrame,
  onSave,
  onAddFrame,
  projectId,
  onGenerateScene,
}) => {
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 3

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [musicPrompt, setMusicPrompt] = useState('')
  const [voiceOptions, setVoiceOptions] = useState<ElevenLabsVoiceOption[]>([])
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null)
  const [sunoUrlInput, setSunoUrlInput] = useState('')
  const [isAttachingSunoTrack, setIsAttachingSunoTrack] = useState(false)
  const [isSceneDialogOpen, setIsSceneDialogOpen] = useState(false)
  const [newScenePrompt, setNewScenePrompt] = useState('')
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [isCreatingScene, setIsCreatingScene] = useState(false)

  const timelineRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const lastPromptFrameRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFrameCountRef = useRef<number>(0)

  const handleAddFrameClick = useCallback(() => {
    if (onAddFrame) {
      onAddFrame()
    }
  }, [onAddFrame])

  const handleOpenSceneDialog = useCallback(() => {
    if (!onGenerateScene) {
      handleAddFrameClick()
      return
    }
    setSceneError(null)
    setNewScenePrompt('')
    setIsSceneDialogOpen(true)
  }, [onGenerateScene, handleAddFrameClick])

  const handleScenePromptChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewScenePrompt(event.target.value)
    setSceneError(null)
  }, [])

  const handleSceneDialogClose = useCallback(() => {
    if (isCreatingScene) return
    setIsSceneDialogOpen(false)
    setSceneError(null)
    setNewScenePrompt('')
  }, [isCreatingScene])

  const handleSceneSubmit = useCallback(async () => {
    if (!onGenerateScene) {
      handleAddFrameClick()
      setIsSceneDialogOpen(false)
      return
    }
    const trimmed = newScenePrompt.trim()
    if (!trimmed) {
      setSceneError('Please enter a prompt for the new scene.')
      return
    }
    setSceneError(null)
    setIsCreatingScene(true)
    try {
      await onGenerateScene(trimmed)
      setIsSceneDialogOpen(false)
      setNewScenePrompt('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate scene'
      setSceneError(message)
    } finally {
      setIsCreatingScene(false)
    }
  }, [onGenerateScene, newScenePrompt, handleAddFrameClick])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Number(Math.max(MIN_ZOOM, prev - 0.2).toFixed(2)))
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Number(Math.min(MAX_ZOOM, prev + 0.2).toFixed(2)))
  }, [])

  const handleZoomSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
    setZoom(clamped)
  }, [])

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    setVolume(Math.min(1, Math.max(0, value)))
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || target.getAttribute('contenteditable') === 'true') {
          return
        }
      }

      if (isSceneDialogOpen) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        handleZoomIn()
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        handleZoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, handleZoomIn, handleZoomOut, isSceneDialogOpen])

  // Calculate total timeline duration (12.01s like in the image)
  const totalDuration = frames.reduce((acc, frame) => acc + (frame.duration || 3), 0) || 12.01
  const scaledDuration = Math.max(totalDuration * zoom, 60) // Minimum 60 seconds view

  // Calculate frame positions with zoom
  const timelineClips: TimelineClip[] = useMemo(() => {
    return frames.map((frame, index) => {
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
  }, [frames, scaledDuration])

  const selectedFrame = frames.find(f => f.id === selectedFrameId)
  const selectedClip = useMemo(() => {
    return timelineClips.find(clip => clip.frame.id === selectedFrameId) || null
  }, [timelineClips, selectedFrameId])
  const disableExternalGeneration = !projectId
  const defaultVoiceOption = defaultVoiceId
    ? voiceOptions.find(voice => voice.id === defaultVoiceId)
    : undefined

  useEffect(() => {
    if (frames.length === 0) {
      previousFrameCountRef.current = 0
      setSelectedFrameId(null)
      setCurrentTime(0)
      return
    }

    if (!selectedFrameId) {
      setSelectedFrameId(frames[0].id)
      const firstClip = timelineClips.find(clip => clip.frame.id === frames[0].id)
      if (firstClip) {
        setCurrentTime(firstClip.startTime)
      }
    }

    if (frames.length > previousFrameCountRef.current) {
      const newFrame = frames[frames.length - 1]
      setSelectedFrameId(newFrame.id)
      const newClip = timelineClips.find(clip => clip.frame.id === newFrame.id)
      if (newClip) {
        setCurrentTime(newClip.startTime)
      }
    }

    previousFrameCountRef.current = frames.length
  }, [frames, selectedFrameId, timelineClips])

  useEffect(() => {
    if (!selectedClip) return
    setCurrentTime(prev => {
      if (prev < selectedClip.startTime || prev > selectedClip.startTime + selectedClip.duration) {
        return selectedClip.startTime
      }
      return prev
    })
  }, [selectedClip])

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

  useEffect(() => {
    if (!selectedFrame) {
      setGenerationError(null)
      return
    }

    if (lastPromptFrameRef.current !== selectedFrame.id) {
      setMusicPrompt(selectedFrame.sound || selectedFrame.shotDescription || '')
      lastPromptFrameRef.current = selectedFrame.id
      setGenerationError(null)
      return
    }

    if (!musicPrompt) {
      setMusicPrompt(selectedFrame.sound || selectedFrame.shotDescription || '')
    }
  }, [selectedFrame, musicPrompt])

  useEffect(() => {
    if (!selectedFrame) {
      setSunoUrlInput('')
      return
    }

    setSunoUrlInput(selectedFrame.sunoTrackUrl || '')
  }, [selectedFrame])

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

  // Playback loop advancing currentTime when no video clip is available
  useEffect(() => {
    if (!isPlaying || selectedFrame?.videoUrl) {
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
  }, [isPlaying, frames, selectedFrame?.videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!selectedFrame?.videoUrl) {
      video.pause()
      try {
        video.currentTime = 0
      } catch {}
      setIsPlaying(false)
      return
    }

    video.pause()
    try {
      video.currentTime = 0
    } catch {}
    setIsPlaying(false)
    if (selectedClip) {
      setCurrentTime(selectedClip.startTime)
    }
  }, [selectedFrame?.id, selectedFrame?.videoUrl, selectedClip])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.volume = volume
      video.muted = volume <= 0
    }
  }, [volume, selectedFrame?.videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedFrame?.videoUrl) return

    if (isPlaying) {
      const playPromise = video.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => setIsPlaying(false))
      }
    } else {
      video.pause()
    }
  }, [isPlaying, selectedFrame?.videoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedFrame?.videoUrl) return

    const handleTimeUpdate = () => {
      if (!selectedClip) return
      setCurrentTime(selectedClip.startTime + video.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleLoadedMetadata = () => {
      if (!selectedFrame) return
      const duration = video.duration
      if (Number.isFinite(duration) && duration > 0) {
        onUpdateFrame(selectedFrame.id, { duration })
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [selectedFrame, selectedClip, onUpdateFrame])

  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    if (isFullscreen) {
      if (!document.fullscreenElement) {
        if (typeof element.requestFullscreen === 'function') {
          element.requestFullscreen().catch(() => setIsFullscreen(false))
        } else {
          setIsFullscreen(false)
        }
      }
    } else if (document.fullscreenElement === element) {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [isFullscreen])

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
      const rawDelta = (deltaX / rect.width) * scaledDuration
      const scaleFactor = totalDuration > 0 ? totalDuration / scaledDuration : 1
      const deltaTime = rawDelta * scaleFactor

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
      if (type === 'audio') {
        onUpdateFrame(frameId, { audioUrl: url, sunoTrackUrl: undefined })
        setSunoUrlInput('')
      } else {
        onUpdateFrame(frameId, { voiceOverUrl: url })
      }
    },
    [onUpdateFrame, setSunoUrlInput]
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

  const handleGenerateVoiceOver = useCallback(async () => {
    if (!selectedFrame) {
      setGenerationError('Select a scene before generating voice over.')
      return
    }

    if (!projectId) {
      setGenerationError('Project ID is missing. Connect this timeline to a project to generate voice overs.')
      return
    }

    const script = (selectedFrame.voiceOverText || '').trim()
    if (!script) {
      setGenerationError('Add a voice-over script before generating audio.')
      return
    }

    try {
      setGenerationError(null)
      setIsGeneratingVoice(true)

      const response = await fetch('/api/audio/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          frameId: selectedFrame.id,
          text: script,
          voiceId: selectedFrame.voiceOverVoiceId || undefined,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        audioUrl?: string
        error?: string
        clipId?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate voice over')
      }

      if (!payload?.audioUrl) {
        throw new Error('Voice over generation completed without returning an audio URL.')
      }

      onUpdateFrame(selectedFrame.id, { voiceOverUrl: payload.audioUrl })
    } catch (error) {
      console.error('Voice over generation failed:', error)
      setGenerationError((error as Error).message || 'Voice over generation failed.')
    } finally {
      setIsGeneratingVoice(false)
    }
  }, [projectId, selectedFrame, onUpdateFrame])

  const handleGenerateMusic = useCallback(async () => {
    if (!selectedFrame) {
      setGenerationError('Select a scene before generating background music.')
      return
    }

    if (!projectId) {
      setGenerationError('Project ID is missing. Connect this timeline to a project to generate music.')
      return
    }

    const promptValue = musicPrompt.trim()
    if (!promptValue) {
      setGenerationError('Add a music prompt before generating background music.')
      return
    }

    try {
      setGenerationError(null)
      setIsGeneratingMusic(true)

      const response = await fetch('/api/audio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          frameId: selectedFrame.id,
          prompt: promptValue,
          title: `Scene ${selectedFrame.scene} Background`,
          tags: selectedFrame.moodLighting || selectedFrame.sound || undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate music')
      }

      if (!payload?.audioUrl) {
        throw new Error('Music generation completed without returning an audio URL.')
      }

      const clipReference =
        typeof payload.clipId === 'string' && payload.clipId.length > 0
          ? payload.clipId
          : selectedFrame.sunoTrackUrl

      onUpdateFrame(selectedFrame.id, {
        audioUrl: payload.audioUrl,
        sunoTrackUrl: clipReference,
      })

      if (typeof payload.clipId === 'string' && payload.clipId.length > 0) {
        setSunoUrlInput(payload.clipId)
      }
    } catch (error) {
      console.error('Music generation failed:', error)
      setGenerationError((error as Error).message || 'Music generation failed.')
    } finally {
      setIsGeneratingMusic(false)
    }
  }, [projectId, selectedFrame, onUpdateFrame, musicPrompt])

  const handleAttachSunoTrack = useCallback(async () => {
    if (!selectedFrame) {
      setGenerationError('Select a scene before attaching Suno music.')
      return
    }

    if (!projectId) {
      setGenerationError('Project ID is missing. Connect this timeline to a project to attach Suno tracks.')
      return
    }

    const reference = sunoUrlInput.trim()
    if (!reference) {
      setGenerationError('Paste a Suno track URL or clip ID before attaching.')
      return
    }

    try {
      setGenerationError(null)
      setIsAttachingSunoTrack(true)

      const response = await fetch('/api/audio/music/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          frameId: selectedFrame.id,
          clipUrl: reference,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        audioUrl?: string
        error?: string
        clipId?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to attach Suno track')
      }

      if (!payload?.audioUrl) {
        throw new Error('Suno track attachment completed without returning an audio URL.')
      }

      const storedReference =
        typeof payload.clipId === 'string' && payload.clipId.length > 0 ? payload.clipId : reference

      onUpdateFrame(selectedFrame.id, {
        audioUrl: payload.audioUrl,
        sunoTrackUrl: storedReference,
      })

      setSunoUrlInput(storedReference)
    } catch (error) {
      console.error('Suno track attachment failed:', error)
      setGenerationError((error as Error).message || 'Failed to attach Suno track.')
    } finally {
      setIsAttachingSunoTrack(false)
    }
  }, [projectId, selectedFrame, sunoUrlInput, onUpdateFrame])

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

  const handleSelectClip = useCallback(
    (clip: TimelineClip) => {
      setSelectedFrameId(clip.frame.id)
      setCurrentTime(clip.startTime)
      setIsPlaying(false)
      if (clip.frame.videoUrl && videoRef.current) {
        try {
          videoRef.current.currentTime = 0
        } catch (error) {
          console.warn('[Timeline] Unable to reset video after clip select:', error)
        }
      }
    },
    []
  )

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const ratio = rect.width > 0 ? clickX / rect.width : 0
      const clamped = Math.max(0, Math.min(ratio * scaledDuration, totalDuration))
      setCurrentTime(clamped)

      const clip = timelineClips.find(
        candidate =>
          clamped >= candidate.startTime && clamped <= candidate.startTime + candidate.duration
      )

      if (clip) {
        setSelectedFrameId(clip.frame.id)
        if (clip.frame.videoUrl && videoRef.current) {
          const relativeTime = Math.max(0, clamped - clip.startTime)
          try {
            if (videoRef.current.duration && relativeTime > videoRef.current.duration) {
              videoRef.current.currentTime = videoRef.current.duration
            } else {
              videoRef.current.currentTime = relativeTime
            }
          } catch (error) {
            console.warn('[Timeline] Unable to set video currentTime:', error)
          }
        }
        setIsPlaying(false)
      }
    },
    [scaledDuration, totalDuration, timelineClips]
  )

  const playButtonLabel = isPlaying ? 'Pause timeline playback' : 'Play timeline'
  const fullscreenLabel = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
  const addSceneLabel = onAddFrame ? 'Add blank scene' : 'Add scene'
  const generateSceneLabel = onGenerateScene ? 'Generate new scene from prompt' : 'Add scene'

  return (
    <div ref={containerRef} className="h-full bg-neutral-950 text-white flex">
      <div className="flex-1 flex flex-col">
        {/* Video Player Section - Matches the image layout */}
        <div className="flex-1 bg-black relative overflow-hidden">
          {selectedFrame?.videoUrl ? (
            <video
              key={selectedFrame.videoUrl}
              ref={videoRef}
              src={selectedFrame.videoUrl}
              poster={selectedFrame.imageUrl}
              className="w-full h-full object-contain bg-black"
              playsInline
              preload="metadata"
              muted={volume === 0}
              controls={false}
            />
          ) : selectedFrame?.imageUrl ? (
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
                type="button"
                onClick={handleAddFrameClick}
                className="flex items-center justify-center w-9 h-9 bg-white rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-40"
                aria-label={addSceneLabel}
                disabled={!onAddFrame}
              >
                <Plus className="w-4 h-4 text-black" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={togglePlay}
                className="flex items-center justify-center w-9 h-9 bg-white rounded-full hover:bg-neutral-200 transition-colors"
                aria-label={playButtonLabel}
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
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 rounded hover:bg-neutral-700 disabled:opacity-40"
                  aria-label="Zoom out"
                  disabled={zoom <= MIN_ZOOM + 0.01}
                >
                  <ZoomOut className="w-4 h-4 text-neutral-200" />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.1}
                  value={zoom}
                  onChange={handleZoomSliderChange}
                  aria-label="Timeline zoom"
                  className="w-28 accent-white"
                />
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 rounded hover:bg-neutral-700 disabled:opacity-40"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM - 0.01}
                >
                  <ZoomIn className="w-4 h-4 text-neutral-200" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-neutral-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="Video volume"
                  className="w-24 accent-white"
                />
              </div>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-1 hover:bg-neutral-700 rounded transition-colors"
                aria-label={fullscreenLabel}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenSceneDialog}
                className="flex items-center justify-center w-9 h-9 bg-white rounded-full hover:bg-neutral-200 transition-colors"
                aria-label={generateSceneLabel}
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
                  onClick={() => handleSelectClip(clip)}
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
                        {(clip.frame.shotDescription || '').slice(0, 15)}...
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
      </div>

      {/* Audio + Voice Over Sidebar */}
      <aside
        className={`border-l border-neutral-800 bg-neutral-900/90 backdrop-blur transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        } flex flex-col`}
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 font-semibold">
              <Settings className="w-4 h-4" />
              <span>Audio Layers</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-neutral-800 rounded"
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            {selectedFrame ? (
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm font-semibold text-neutral-200 mb-2">
                    Scene {selectedFrame.scene}
                  </h5>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Attach background music or voice over to this scene so the final edit stays in sync.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Music className="w-4 h-4 text-green-300" />
                      Background Music
                    </div>
                    {selectedFrame.audioUrl && (
                      <button
                        onClick={() =>
                          onUpdateFrame(selectedFrame.id, { audioUrl: undefined, sunoTrackUrl: undefined })
                        }
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-neutral-400">
                      Prompt
                    </label>
                    <textarea
                      value={musicPrompt}
                      onChange={e => setMusicPrompt(e.target.value)}
                      placeholder="Describe the vibe or instruments for the background score."
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white resize-none text-sm"
                      rows={3}
                      disabled={isGeneratingMusic}
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleGenerateMusic}
                        disabled={disableExternalGeneration || isGeneratingMusic}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors disabled:bg-neutral-800 disabled:text-neutral-500"
                      >
                        {isGeneratingMusic ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Music className="w-4 h-4" />
                        )}
                        <span>{isGeneratingMusic ? 'Generating with Suno…' : 'Generate with Suno'}</span>
                      </button>
                      {disableExternalGeneration && (
                        <p className="text-xs text-neutral-500 text-center">
                          Connect to a project with API credentials to enable Suno integration.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-neutral-400">
                      Suno Track URL or ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={sunoUrlInput}
                        onChange={e => setSunoUrlInput(e.target.value)}
                        placeholder="https://app.suno.ai/song/..."
                        className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:border-neutral-500"
                        disabled={isAttachingSunoTrack}
                      />
                      <button
                        onClick={handleAttachSunoTrack}
                        disabled={disableExternalGeneration || isAttachingSunoTrack || isGeneratingMusic}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-neutral-700 rounded text-sm font-medium hover:border-neutral-500 transition-colors disabled:bg-neutral-800 disabled:text-neutral-500"
                      >
                        {isAttachingSunoTrack ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        <span>{isAttachingSunoTrack ? 'Attaching…' : 'Attach Suno Track'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Paste a Suno song link or clip ID to import it using your project credentials.
                    </p>
                    {selectedFrame.sunoTrackUrl && (
                      <div className="text-xs text-neutral-400 break-all">
                        Attached:{' '}
                        {/^(https?:)?\/\//i.test(selectedFrame.sunoTrackUrl) ? (
                          <a
                            href={selectedFrame.sunoTrackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {selectedFrame.sunoTrackUrl}
                          </a>
                        ) : (
                          <span className="font-mono text-neutral-300">{selectedFrame.sunoTrackUrl}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedFrame.audioUrl ? (
                    <div className="space-y-2">
                      <audio controls className="w-full" src={selectedFrame.audioUrl} />
                      <div className="text-xs text-neutral-400">
                        Replace the clip by uploading a new track.
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-neutral-700 rounded hover:border-neutral-500 transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Replace Background Music
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-600 rounded hover:border-neutral-500 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Background Music
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mic className="w-4 h-4 text-purple-300" />
                      Voice Over
                    </div>
                    {selectedFrame.voiceOverUrl && (
                      <button
                        onClick={() => onUpdateFrame(selectedFrame.id, { voiceOverUrl: undefined })}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-neutral-400">Script</label>
                      <textarea
                        value={selectedFrame.voiceOverText || ''}
                        onChange={e => handleVoiceOverTextChange(selectedFrame.id, e.target.value)}
                        placeholder="Write the narration that matches this scene."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white resize-none text-sm"
                        rows={4}
                        disabled={isGeneratingVoice}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-neutral-400">
                        ElevenLabs Voice
                      </label>
                      <select
                        value={selectedFrame.voiceOverVoiceId || ''}
                        onChange={handleVoiceSelectionChange}
                        disabled={isGeneratingVoice || isLoadingVoices}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm text-white focus:border-neutral-500 disabled:opacity-80"
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

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleGenerateVoiceOver}
                        disabled={disableExternalGeneration || isGeneratingVoice}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors disabled:bg-neutral-800 disabled:text-neutral-500"
                      >
                        {isGeneratingVoice ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        <span>
                          {isGeneratingVoice ? 'Generating with ElevenLabs…' : 'Generate with ElevenLabs'}
                        </span>
                      </button>
                      {disableExternalGeneration && (
                        <p className="text-xs text-neutral-500 text-center">
                          Connect to a project with API credentials to enable ElevenLabs.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedFrame.voiceOverUrl ? (
                    <div className="space-y-2">
                      <audio controls className="w-full" src={selectedFrame.voiceOverUrl} />
                      <button
                        onClick={() => voiceInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-neutral-700 rounded hover:border-neutral-500 transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Replace Voice Over
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
                </div>

                {generationError && (
                  <div className="flex items-start gap-2 rounded border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4">
                <div className="text-sm text-neutral-500 space-y-2">
                  <Settings className="w-8 h-8 mx-auto opacity-40" />
                  <p>Select a scene on the timeline to attach background music or a voice over.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

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

      {isSceneDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Generate New Scene</h2>
              <p className="text-sm text-neutral-400">
                Describe the shot you want to add. A new scene will be created and an AI-generated image
                will be attached automatically.
              </p>
            </div>
            <div>
              <label className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400 mb-2">
                <span>Prompt</span>
                <span className="text-neutral-500">{newScenePrompt.trim().length} / 400</span>
              </label>
              <textarea
                value={newScenePrompt}
                onChange={handleScenePromptChange}
                placeholder="e.g. Moody close-up of the hero standing in the rain under neon lights"
                className="w-full min-h-[140px] bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none"
                maxLength={400}
                disabled={isCreatingScene}
                autoFocus
              />
              {sceneError && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {sceneError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSceneDialogClose}
                className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                disabled={isCreatingScene}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSceneSubmit}
                disabled={isCreatingScene}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center gap-2"
              >
                {isCreatingScene && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isCreatingScene ? 'Generating…' : 'Generate Scene'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
