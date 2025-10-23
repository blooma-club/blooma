import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateVideoFromImage } from '@/lib/videoProviders'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { frameId, projectId, imageUrl, prompt, modelId } = body ?? {}

    if (!frameId || !projectId || !imageUrl) {
      return NextResponse.json(
        { error: 'frameId, projectId, and imageUrl are required' },
        { status: 400 }
      )
    }

    // 카드 소유권 확인
    const cardResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cards?project_id=${projectId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    if (!cardResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify card ownership' }, { status: 403 })
    }

    const cardsData = await cardResponse.json()
    const cardRecord = cardsData.data?.find((card: any) => card.id === frameId)

    if (!cardRecord) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
    }

    if (cardRecord.user_id !== userId || cardRecord.project_id !== projectId) {
      return NextResponse.json({ error: 'Access denied for this frame' }, { status: 403 })
    }

    const videoPrompt: string = typeof prompt === 'string' && prompt.trim().length > 0
      ? prompt.trim()
      : 'Animate this storyboard frame as a short cinematic clip'

    const videoResult = await generateVideoFromImage({
      projectId,
      frameId,
      imageUrl,
      prompt: videoPrompt,
      modelId,
    })

    // 카드 업데이트
    const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cards`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        cards: [{
          id: frameId,
          video_url: videoResult.videoUrl,
          video_key: videoResult.key,
          video_prompt: videoPrompt,
        }]
      }),
    })

    if (!updateResponse.ok) {
      console.error('[video][update] Failed to persist video URL')
      throw new Error('Failed to update card with video data')
    }

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
