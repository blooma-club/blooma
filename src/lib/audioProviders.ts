import { fal } from '@fal-ai/client'
import { uploadAudioToR2 } from './r2'

interface VoiceOverParams {
  projectId: string
  frameId: string
  text: string
  voiceId?: string
  stability?: number
  clarityBoost?: number
  style?: number
}

interface MusicParams {
  projectId: string
  frameId: string
  prompt: string
  title?: string
  tags?: string
  model?: string
  waitMs?: number
  maxAttempts?: number
}

interface AudioGenerationResult {
  audioUrl: string | null
  signedUrl?: string | null
  key: string
  contentType: string | null
  clipId?: string
}

function pickUrl(publicUrl: string | null, signedUrl: string | null | undefined) {
  if (publicUrl) return publicUrl
  if (signedUrl) return signedUrl
  return ''
}

type SunoClipStatus = {
  id?: string
  status?: 'queued' | 'processing' | 'complete' | 'failed'
  audio_url?: string
  error?: string
}

type SunoGenerateResponse = {
  clips?: Array<{ id?: string | null }>
}

export async function generateVoiceOverWithElevenLabs({
  projectId,
  frameId,
  text,
  voiceId,
  stability,
  clarityBoost,
  style,
}: VoiceOverParams): Promise<AudioGenerationResult> {
  ensureFalVoiceConfigured()

  const resolvedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID
  if (!resolvedVoiceId) {
    throw new Error('Voice ID is not provided. Configure ELEVENLABS_VOICE_ID or pass voiceId.')
  }

  const payload: Record<string, unknown> = {
    text,
    voice: resolvedVoiceId,
    voice_id: resolvedVoiceId,
    model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_v3',
    voice_settings: {
      stability: stability ?? Number(process.env.ELEVENLABS_VOICE_STABILITY ?? 0.6),
      similarity_boost: clarityBoost ?? Number(process.env.ELEVENLABS_VOICE_SIMILARITY ?? 0.75),
      style: style ?? Number(process.env.ELEVENLABS_VOICE_STYLE ?? 0),
      use_speaker_boost: true,
    },
  }

  if (process.env.ELEVENLABS_API_KEY) {
    payload.api_key = process.env.ELEVENLABS_API_KEY
  }

  let submission: unknown
  try {
    submission = await fal.subscribe('fal-ai/elevenlabs/text-to-dialogue/eleven-v3', {
      input: payload,
      logs: true,
    })
  } catch (error) {
    throw new Error(`Fal ElevenLabs request failed: ${(error as Error)?.message || 'Unknown error'}`)
  }

  const audioUrl = extractAudioUrl(submission)

  let buffer: Uint8Array
  let contentType = 'audio/mpeg'

  if (audioUrl.startsWith('data:')) {
    const match = audioUrl.match(/^data:(.*?);base64,(.*)$/)
    if (!match) {
      throw new Error('Received malformed data URI from ElevenLabs response')
    }
    contentType = match[1] || 'audio/mpeg'
    buffer = new Uint8Array(Buffer.from(match[2], 'base64'))
  } else {
    const downloaded = await fetchAudioBuffer(audioUrl)
    buffer = downloaded.buffer
    if (downloaded.contentType) {
      contentType = downloaded.contentType
    }
  }

  const uploadResult = await uploadAudioToR2({
    projectId,
    frameId,
    buffer,
    contentType,
    kind: 'voice',
  })

  return {
    audioUrl: pickUrl(uploadResult.publicUrl, uploadResult.signedUrl),
    signedUrl: uploadResult.signedUrl,
    key: uploadResult.key,
    contentType: uploadResult.contentType,
  }
}

function ensureFalVoiceConfigured() {
  const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY
  if (!falKey) {
    throw new Error('FAL_KEY is not configured for voice generation')
  }
  fal.config({ credentials: falKey })
}

function isLikelyAudioUrl(candidate: string): boolean {
  const lower = candidate.toLowerCase()
  if (!/^https?:\/\//.test(candidate)) return false
  return (
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.aac') ||
    lower.includes('/audio/') ||
    lower.includes('.mp3?') ||
    lower.includes('.wav?')
  )
}

function extractAudioUrl(submission: unknown): string {
  let audioUrl: string | undefined
  let base64Fallback: string | undefined

  const stack: unknown[] = [submission]
  const seen = new Set<unknown>()

  while (stack.length) {
    const current = stack.pop()
    if (!current || seen.has(current)) continue
    seen.add(current)

    if (typeof current === 'string') {
      const trimmed = current.trim()
      if (!audioUrl && (trimmed.startsWith('data:audio') || isLikelyAudioUrl(trimmed))) {
        audioUrl = trimmed
        break
      }
      if (!audioUrl && trimmed.length > 50) {
        base64Fallback = trimmed
      }
      continue
    }

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>
      const candidates = [record.url, record.audio_url, record.audioUrl]
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && (candidate.startsWith('data:audio') || isLikelyAudioUrl(candidate))) {
          audioUrl = candidate
          break
        }
      }
      if (audioUrl) break

      const base64Candidate =
        typeof record.base64 === 'string'
          ? record.base64
          : typeof record.b64 === 'string'
            ? record.b64
            : undefined

      if (!audioUrl && base64Candidate && base64Candidate.length > 50) {
        base64Fallback = base64Candidate
      }

      for (const value of Object.values(record)) {
        stack.push(value)
      }
    }
  }

  if (!audioUrl && base64Fallback) {
    audioUrl = base64Fallback.startsWith('data:')
      ? base64Fallback
      : `data:audio/mpeg;base64,${base64Fallback}`
  }

  if (!audioUrl) {
    throw new Error('Fal ElevenLabs response did not include an audio URL')
  }

  return audioUrl
}

async function fetchAudioBuffer(url: string, attempts = 3) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120000),
        headers: { 'User-Agent': 'Blooma/1.0' },
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Failed to download generated audio: ${response.status} ${response.statusText} - ${errText}`
        )
      }

      const contentType = response.headers.get('content-type') || 'audio/mpeg'
      const buffer = new Uint8Array(await response.arrayBuffer())

      return { buffer, contentType }
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        const delay = Math.min(4000 * attempt, 8000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to download generated audio')
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pollSunoClip(
  clipId: string,
  apiKey: string,
  attempts: number,
  waitMs: number
): Promise<SunoClipStatus> {
  for (let i = 0; i < attempts; i++) {
    const statusRes = await fetch(`https://api.suno.ai/api/clip/${clipId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(60000),
    })

    if (!statusRes.ok) {
      const errText = await statusRes.text().catch(() => 'Unknown error')
      throw new Error(`Failed to poll Suno clip ${clipId}: ${statusRes.status} ${errText}`)
    }

    const data = (await statusRes.json()) as SunoClipStatus
    if (data?.audio_url && data.status === 'complete') {
      return data
    }

    if (data?.status === 'failed') {
      throw new Error(`Suno generation failed for clip ${clipId}: ${data?.error || 'Unknown error'}`)
    }

    await wait(waitMs)
  }

  throw new Error(`Timed out waiting for Suno clip ${clipId} to complete`)
}

async function downloadSunoClipAudio({
  projectId,
  frameId,
  clipId,
  apiKey,
  waitMs,
  maxAttempts,
}: {
  projectId: string
  frameId: string
  clipId: string
  apiKey: string
  waitMs: number
  maxAttempts: number
}): Promise<AudioGenerationResult> {
  const clipData = await pollSunoClip(clipId, apiKey, maxAttempts, waitMs)
  const audioUrl = clipData?.audio_url

  if (!audioUrl) {
    throw new Error(`Suno clip ${clipId} did not include an audio URL after completion`)
  }

  const audioRes = await fetch(audioUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(120000),
  })

  if (!audioRes.ok) {
    const errText = await audioRes.text().catch(() => 'Unknown error')
    throw new Error(`Failed to download Suno audio for clip ${clipId}: ${audioRes.status} ${errText}`)
  }

  const audioBuffer = await audioRes.arrayBuffer()
  const uploadResult = await uploadAudioToR2({
    projectId,
    frameId,
    buffer: new Uint8Array(audioBuffer),
    contentType: audioRes.headers.get('content-type') || 'audio/mpeg',
    kind: 'music',
  })

  return {
    audioUrl: pickUrl(uploadResult.publicUrl, uploadResult.signedUrl),
    signedUrl: uploadResult.signedUrl,
    key: uploadResult.key,
    contentType: uploadResult.contentType,
    clipId,
  }
}

export async function generateMusicWithSuno({
  projectId,
  frameId,
  prompt,
  title,
  tags,
  model,
  waitMs = 4000,
  maxAttempts = 20,
}: MusicParams): Promise<AudioGenerationResult> {
  const apiKey = process.env.SUNO_API_KEY
  if (!apiKey) {
    throw new Error('SUNO_API_KEY is not configured')
  }

  const payload: Record<string, unknown> = {
    gpt_description: prompt,
    mv: model || process.env.SUNO_MODEL_ID || 'chirp-v3-5',
    title: title || 'Blooma Scene Music',
    tags: tags || process.env.SUNO_DEFAULT_TAGS || 'ambient cinematic soundtrack',
  }

  const response = await fetch('https://api.suno.ai/api/generate/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Suno request failed: ${response.status} ${response.statusText} - ${errText}`)
  }

  const body = (await response.json()) as SunoGenerateResponse
  const clipIds = (body.clips ?? [])
    .map(clip => clip.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (clipIds.length === 0) {
    throw new Error('Suno did not return any clip identifiers')
  }

  return downloadSunoClipAudio({
    projectId,
    frameId,
    clipId: clipIds[0],
    apiKey,
    waitMs,
    maxAttempts,
  })
}

export async function attachExistingSunoClip({
  projectId,
  frameId,
  clipId,
  waitMs = 3000,
  maxAttempts = 10,
}: {
  projectId: string
  frameId: string
  clipId: string
  waitMs?: number
  maxAttempts?: number
}): Promise<AudioGenerationResult> {
  const apiKey = process.env.SUNO_API_KEY
  if (!apiKey) {
    throw new Error('SUNO_API_KEY is not configured')
  }

  if (!clipId) {
    throw new Error('A Suno clip identifier is required to attach existing music')
  }

  return downloadSunoClipAudio({ projectId, frameId, clipId, apiKey, waitMs, maxAttempts })
}
