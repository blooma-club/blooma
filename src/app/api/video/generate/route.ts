import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVideoFromImage } from '@/lib/videoProviders'

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
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

    const { data: cardRecord, error: cardError } = await supabaseClient
      .from('cards')
      .select('id, project_id, user_id')
      .eq('id', frameId)
      .single()

    if (cardError || !cardRecord) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
    }

    if (cardRecord.user_id !== user.id || cardRecord.project_id !== projectId) {
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

    const { error: updateError } = await supabaseClient
      .from('cards')
      .update({
        video_url: videoResult.videoUrl,
        video_key: videoResult.key,
        video_prompt: videoPrompt,
      })
      .eq('id', frameId)

    if (updateError) {
      console.error('[video][update] Failed to persist video URL:', updateError)
      throw new Error(updateError.message)
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
