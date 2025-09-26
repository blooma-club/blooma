import { NextRequest, NextResponse } from 'next/server'
import { attachExistingSunoClip } from '@/lib/audioProviders'

function extractClipId(reference: string): string | null {
  const trimmed = reference.trim()
  if (!trimmed) {
    return null
  }

  const simpleMatch = /^[a-z0-9-]+$/i
  if (simpleMatch.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length === 0) {
      return null
    }

    const candidates = segments.reverse()
    for (const segment of candidates) {
      if (simpleMatch.test(segment)) {
        return segment
      }
    }
  } catch {
    // Ignore URL parse failure; fall through to null return
  }

  return null
}

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, frameId, clipUrl, clipId } = body as Record<string, unknown>

    if (typeof projectId !== 'string' || typeof frameId !== 'string') {
      return NextResponse.json({ error: 'projectId and frameId are required' }, { status: 400 })
    }

    const reference =
      typeof clipId === 'string' && clipId.trim().length > 0
        ? clipId
        : typeof clipUrl === 'string'
          ? clipUrl
          : ''

    const resolvedClipId = extractClipId(reference)
    if (!resolvedClipId) {
      return NextResponse.json(
        {
          error: 'Provide a Suno clip ID or a valid Suno song URL ending with the clip identifier.',
        },
        { status: 400 }
      )
    }

    const result = await attachExistingSunoClip({ projectId, frameId, clipId: resolvedClipId })
    if (!result.audioUrl) {
      return NextResponse.json({ error: 'Suno clip attached but no audio URL was returned' }, { status: 500 })
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      assetKey: result.key,
      contentType: result.contentType,
      clipId: result.clipId ?? resolvedClipId,
    })
  } catch (error) {
    console.error('[Suno Attach API] Failed to attach clip:', error)
    return NextResponse.json({ error: (error as Error).message || 'Failed to attach Suno clip' }, { status: 500 })
  }
}
