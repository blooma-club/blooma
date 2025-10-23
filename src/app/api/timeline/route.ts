import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { queryD1, queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

type CardUpdate = {
  duration?: number | null
  audio_url?: string | null
  voice_over_url?: string | null
  voice_over_text?: string | null
  start_time?: number | null
  video_url?: string | null
}

type TimelineUpdatePayload = {
  id: string
  duration?: number | null
  audioUrl?: string | null
  voiceOverUrl?: string | null
  voiceOverText?: string | null
  startTime?: number | null
  videoUrl?: string | null
}

type FrameUpdateResult =
  | { id: string; data: unknown; error?: undefined }
  | { id: string; data?: undefined; error: string }
  | null

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { frameId, duration, audioUrl, voiceOverUrl, voiceOverText, startTime, videoUrl } = body

    if (!frameId) {
      return NextResponse.json({ error: 'Frame ID is required' }, { status: 400 })
    }

    // Update the cards table with timeline data (using snake_case column names)
    const updateData: CardUpdate = {}
    
    if (duration !== undefined) updateData.duration = duration
    if (audioUrl !== undefined) updateData.audio_url = audioUrl
    if (voiceOverUrl !== undefined) updateData.voice_over_url = voiceOverUrl
    if (voiceOverText !== undefined) updateData.voice_over_text = voiceOverText
    if (startTime !== undefined) updateData.start_time = startTime
    if (videoUrl !== undefined) updateData.video_url = videoUrl

    // Build dynamic SQL update query
    const updateFields = Object.keys(updateData)
      .map((key, index) => `${key} = ?${index + 2}`)
      .join(', ')

    const updateValues = Object.values(updateData)
    const sql = `UPDATE cards SET ${updateFields} WHERE id = ?1 AND user_id = ?${updateFields.split(',').length + 1}`

    await queryD1(sql, [frameId, ...updateValues, userId])

    // Fetch updated data
    const updatedCard = await queryD1Single(
      `SELECT id, duration, audio_url, voice_over_url, voice_over_text, start_time, video_url 
       FROM cards WHERE id = ?1 AND user_id = ?2`,
      [frameId, userId]
    )

    if (!updatedCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    return NextResponse.json({ data: updatedCard })
  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[timeline] D1 not configured', error)
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (error instanceof D1QueryError) {
      console.error('[timeline] D1 query failed', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    console.error('Timeline API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get timeline data for all frames in the project (using snake_case column names)
    const data = await queryD1(
      `SELECT id, duration, audio_url, voice_over_url, voice_over_text, start_time, video_url, order_index
       FROM cards 
       WHERE project_id = ?1 AND user_id = ?2
       ORDER BY order_index`,
      [projectId, userId]
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[timeline] D1 not configured', error)
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (error instanceof D1QueryError) {
      console.error('[timeline] D1 query failed', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    console.error('Timeline API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Batch update multiple frames at once
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { frames } = body

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json({ error: 'Frames array is required' }, { status: 400 })
    }

    const framesArray: unknown[] = frames

    // Perform batch updates
    const updates: Array<Promise<FrameUpdateResult>> = framesArray.map(async (frameItem: unknown) => {
      if (!frameItem || typeof frameItem !== 'object') {
        return null
      }

      const { id, duration, audioUrl, voiceOverUrl, voiceOverText, startTime, videoUrl } = frameItem as Partial<TimelineUpdatePayload> & { id?: string }
      
      if (!id) return null

      const updateData: CardUpdate = {}
      if (duration !== undefined) updateData.duration = duration
      if (audioUrl !== undefined) updateData.audio_url = audioUrl
      if (voiceOverUrl !== undefined) updateData.voice_over_url = voiceOverUrl
      if (voiceOverText !== undefined) updateData.voice_over_text = voiceOverText
      if (startTime !== undefined) updateData.start_time = startTime
      if (videoUrl !== undefined) updateData.video_url = videoUrl

      try {
        // Build dynamic SQL update query
        const updateFields = Object.keys(updateData)
          .map((key, index) => `${key} = ?${index + 2}`)
          .join(', ')

        const updateValues = Object.values(updateData)
        const sql = `UPDATE cards SET ${updateFields} WHERE id = ?1 AND user_id = ?${updateFields.split(',').length + 1}`

        await queryD1(sql, [id, ...updateValues, userId])

        // Fetch updated data
        const updatedCard = await queryD1Single(
          `SELECT id, duration, audio_url, voice_over_url, voice_over_text, start_time, video_url 
           FROM cards WHERE id = ?1 AND user_id = ?2`,
          [id, userId]
        )

        return { id, data: updatedCard }
      } catch (error) {
        console.error(`Error updating frame ${id}:`, error)
        return { id, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    const results = await Promise.all(updates)
    const successful = results.filter((r): r is { id: string; data: unknown } => !!r && !r.error)
    const failed = results.filter((r): r is { id: string; error: string } => !!r && !!r.error)

    return NextResponse.json({ 
      successful: successful.length,
      failed: failed.length,
      errors: failed 
    })
  } catch (error) {
    console.error('Timeline batch update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}