import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { frameId, duration, audioUrl, voiceOverUrl, voiceOverText, startTime } = body

    if (!frameId) {
      return NextResponse.json({ error: 'Frame ID is required' }, { status: 400 })
    }

    // Update the cards table with timeline data (using snake_case column names)
    const updateData: any = {}
    
    if (duration !== undefined) updateData.duration = duration
    if (audioUrl !== undefined) updateData.audio_url = audioUrl
    if (voiceOverUrl !== undefined) updateData.voice_over_url = voiceOverUrl
    if (voiceOverText !== undefined) updateData.voice_over_text = voiceOverText
    if (startTime !== undefined) updateData.start_time = startTime

    const { data, error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', frameId)
      .select()
      .single()

    if (error) {
      console.error('Timeline update error:', error)
      return NextResponse.json({ error: 'Failed to update timeline data' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get timeline data for all frames in the project (using snake_case column names)
    const { data, error } = await supabase
      .from('cards')
      .select('id, duration, audio_url, voice_over_url, voice_over_text, start_time, order_index')
      .eq('project_id', projectId)
      .order('order_index')

    if (error) {
      console.error('Timeline fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch timeline data' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Batch update multiple frames at once
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { frames } = body

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json({ error: 'Frames array is required' }, { status: 400 })
    }

    // Perform batch updates
    const updates = frames.map(async (frame: any) => {
      const { id, duration, audioUrl, voiceOverUrl, voiceOverText, startTime } = frame
      
      if (!id) return null

      const updateData: any = {}
      if (duration !== undefined) updateData.duration = duration
      if (audioUrl !== undefined) updateData.audio_url = audioUrl
      if (voiceOverUrl !== undefined) updateData.voice_over_url = voiceOverUrl
      if (voiceOverText !== undefined) updateData.voice_over_text = voiceOverText
      if (startTime !== undefined) updateData.start_time = startTime

      const { data, error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating frame ${id}:`, error)
        return { id, error: error.message }
      }

      return { id, data }
    })

    const results = await Promise.all(updates)
    const successful = results.filter(r => r && !r.error)
    const failed = results.filter(r => r && r.error)

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
