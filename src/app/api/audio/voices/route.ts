import { NextResponse } from 'next/server'

interface ElevenLabsVoiceResponse {
  voices?: Array<Record<string, unknown>>
}

interface ElevenLabsVoiceOption {
  id: string
  name: string
  category?: string
  labels?: Record<string, string>
  previewUrl?: string
}

function normalizeVoice(raw: Record<string, unknown>): ElevenLabsVoiceOption | null {
  const id =
    typeof raw.voice_id === 'string'
      ? raw.voice_id
      : typeof raw.voiceId === 'string'
        ? raw.voiceId
        : typeof raw.id === 'string'
          ? raw.id
          : null
  const name = typeof raw.name === 'string' ? raw.name : null

  if (!id || !name) {
    return null
  }

  const categoryCandidate =
    typeof raw.category === 'string'
      ? raw.category
      : typeof raw.voice_category === 'string'
        ? raw.voice_category
        : undefined

  const labels =
    raw.labels && typeof raw.labels === 'object' && !Array.isArray(raw.labels)
      ? (raw.labels as Record<string, string>)
      : undefined

  const previewUrl = typeof raw.preview_url === 'string' ? raw.preview_url : undefined

  return {
    id,
    name,
    category: categoryCandidate,
    labels,
    previewUrl,
  }
}

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || null

  if (!apiKey) {
    const fallbackName =
      process.env.ELEVENLABS_VOICE_NAME ||
      process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_NAME ||
      'Default Voice'
    const fallbackVoices: ElevenLabsVoiceOption[] = defaultVoiceId
      ? [
          {
            id: defaultVoiceId,
            name: fallbackName,
          },
        ]
      : []

    return NextResponse.json({
      voices: fallbackVoices,
      defaultVoiceId,
      warning: 'ELEVENLABS_API_KEY is not configured; returning fallback voice list.',
    })
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      return NextResponse.json(
        { error: `Failed to load ElevenLabs voices: ${response.status} ${errText}` },
        { status: 502 }
      )
    }

    const data = (await response.json()) as ElevenLabsVoiceResponse
    const rawVoices = Array.isArray(data.voices) ? data.voices : []
    const voices = rawVoices
      .map(voice => normalizeVoice(voice))
      .filter((voice): voice is ElevenLabsVoiceOption => Boolean(voice))

    return NextResponse.json({
      voices,
      defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || null,
    })
  } catch (error) {
    console.error('[ElevenLabs Voices API] Failed to list voices:', error)
    return NextResponse.json({ error: 'Failed to load ElevenLabs voices' }, { status: 500 })
  }
}
