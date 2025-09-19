import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { StoryboardInput } from '@/types'

// Extended type for database insertion
type StoryboardInsert = StoryboardInput & {
  user_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body: StoryboardInsert = await request.json()
    
    if (!body.title || !body.user_id) {
      return NextResponse.json(
        { error: 'Title and user_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('storyboards')
      .insert({
        title: body.title,
        description: body.description,
        project_id: body.project_id,
        user_id: body.user_id,
        // is_public: body.is_public ?? false,
        // Simple table structure doesn't include timestamp columns
        // created_at: new Date().toISOString(),
        // updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create storyboard' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const projectId = searchParams.get('project_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('storyboards')
      .select('*')
      .eq('user_id', userId)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch storyboards' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
