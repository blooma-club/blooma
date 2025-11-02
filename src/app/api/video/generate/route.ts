import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateVideoFromImage } from '@/lib/videoProviders'
import { START_TO_END_FRAME_MODEL_IDS } from '@/lib/fal-ai'
import { queryD1 } from '@/lib/db/d1'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const normalizeUrl = (value?: string | null) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

    const {
      frameId,
      projectId,
      imageUrl,
      startImageUrl,
      endImageUrl,
      endFrameId,
      prompt,
      modelId,
    } = body ?? {}

    const normalizedImageUrl = normalizeUrl(imageUrl)
    const normalizedStartImageUrl = normalizeUrl(startImageUrl)
    const normalizedEndImageUrl = normalizeUrl(endImageUrl)

    const effectiveImageUrl = normalizedImageUrl || normalizedStartImageUrl

    if (!frameId || !projectId || !effectiveImageUrl) {
      return NextResponse.json(
        { error: 'frameId, projectId, and a start image URL are required' },
        { status: 400 }
      )
    }

    if (
      modelId &&
      START_TO_END_FRAME_MODEL_IDS.includes(modelId) &&
      !normalizedEndImageUrl
    ) {
      return NextResponse.json(
        { error: 'Selected model requires both start and end image URLs.' },
        { status: 400 }
      )
    }

    type CardRow = {
      id: string
      project_id: string
      user_id: string
      image_url?: string | null
    }

    const fetchCard = async (id: string): Promise<CardRow | null> => {
      const rows = await queryD1<CardRow>(
        `SELECT id, project_id, user_id, image_url FROM cards WHERE id = ?1`,
        [id]
      )
      return rows.length > 0 ? rows[0] : null
    }

    const primaryCard = await fetchCard(frameId)
    if (!primaryCard) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
    }

    if (primaryCard.user_id !== userId || primaryCard.project_id !== projectId) {
      return NextResponse.json({ error: 'Access denied for this frame' }, { status: 403 })
    }

    let verifiedEndCard: CardRow | null = null
    if (typeof endFrameId === 'string' && endFrameId.trim().length > 0) {
      verifiedEndCard = await fetchCard(endFrameId)
      if (!verifiedEndCard) {
        return NextResponse.json({ error: 'End frame not found' }, { status: 404 })
      }
      if (verifiedEndCard.user_id !== userId || verifiedEndCard.project_id !== projectId) {
        return NextResponse.json(
          { error: 'Access denied for the selected end frame' },
          { status: 403 }
        )
      }
    }

    const videoPrompt: string = typeof prompt === 'string' && prompt.trim().length > 0
      ? prompt.trim()
      : 'Animate this storyboard frame as a short cinematic clip'

    const resolvedStartImageUrl =
      normalizedStartImageUrl ?? effectiveImageUrl ?? primaryCard.image_url ?? null
    const resolvedEndImageUrl = normalizedEndImageUrl ?? verifiedEndCard?.image_url ?? null

    const videoResult = await generateVideoFromImage({
      projectId,
      frameId,
      imageUrl: effectiveImageUrl,
      startImageUrl: resolvedStartImageUrl,
      endImageUrl: resolvedEndImageUrl,
      prompt: videoPrompt,
      modelId,
    })

    return NextResponse.json({
      videoUrl: videoResult.videoUrl,
      videoKey: videoResult.key,
      videoPrompt,
      provider: videoResult.provider,
      rawUrl: videoResult.rawUrl,
      signedUrl: videoResult.signedUrl,
      contentType: videoResult.contentType,
    })
  } catch (error) {
    console.error('[video][generate] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    )
  }
}
