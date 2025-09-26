import { NextRequest, NextResponse } from 'next/server'
import { generateVoiceOverWithElevenLabs } from '@/lib/audioProviders'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, frameId, text, voiceId, stability, clarityBoost, style } = body

    if (!projectId || !frameId) {
      return NextResponse.json({ error: 'projectId and frameId are required' }, { status: 400 })
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty text value is required to generate voice over' }, { status: 400 })
    }

    const result = await generateVoiceOverWithElevenLabs({
      projectId,
      frameId,
      text,
      voiceId,
      stability,
      clarityBoost,
      style,
    })

    if (!result.audioUrl) {
      return NextResponse.json({ error: 'Audio generation succeeded but no URL was produced' }, { status: 500 })
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      assetKey: result.key,
      contentType: result.contentType,
    })
  } catch (error) {
    console.error('[VoiceOver API] Failed to generate voice over:', error)
    return NextResponse.json({ error: (error as Error).message || 'Failed to generate voice over' }, { status: 500 })
  }
}
