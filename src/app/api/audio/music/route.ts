import { NextRequest, NextResponse } from 'next/server'
import { generateMusicWithSuno } from '@/lib/audioProviders'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, frameId, prompt, title, tags, model } = body

    if (!projectId || !frameId) {
      return NextResponse.json({ error: 'projectId and frameId are required' }, { status: 400 })
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty prompt is required to generate music' }, { status: 400 })
    }

    const result = await generateMusicWithSuno({
      projectId,
      frameId,
      prompt,
      title,
      tags,
      model,
    })

    if (!result.audioUrl) {
      return NextResponse.json({ error: 'Music generation succeeded but no URL was produced' }, { status: 500 })
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      assetKey: result.key,
      contentType: result.contentType,
    })
  } catch (error) {
    console.error('[Music API] Failed to generate music:', error)
    return NextResponse.json({ error: (error as Error).message || 'Failed to generate music' }, { status: 500 })
  }
}
