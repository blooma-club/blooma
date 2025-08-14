import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Project, ProjectInput } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: ProjectInput = await request.json()
    
    if (!body.title || !body.user_id) {
      return NextResponse.json(
        { error: 'Title and user_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: body.title,
        description: body.description,
        user_id: body.user_id,
        is_public: body.is_public ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      )
    }
    
    // First get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Supabase error details:', {
        message: projectsError.message,
        code: projectsError.code,
        details: projectsError.details,
        hint: projectsError.hint
      })
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: projectsError.message },
        { status: 500 }
      )
    }

    // For each project, check if it has storyboards with cards
    const projectsWithCardInfo = await Promise.all(
      projects.map(async (project) => {
        // Check if project has storyboards
        const { data: storyboards, error: storyboardsError } = await supabase
          .from('storyboards')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', userId)

        if (storyboardsError) {
          console.error('Error fetching storyboards for project:', project.id, storyboardsError)
          return { ...project, has_cards: false }
        }

        if (!storyboards || storyboards.length === 0) {
          return { ...project, has_cards: false }
        }

        // Check if any storyboard has cards
        const storyboardIds = storyboards.map(s => s.id)
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select('id')
          .in('storyboard_id', storyboardIds)
          .eq('user_id', userId)
          .limit(1)

        if (cardsError) {
          console.error('Error fetching cards for project:', project.id, cardsError)
          return { ...project, has_cards: false }
        }

        return { ...project, has_cards: cards && cards.length > 0 }
      })
    )

    return NextResponse.json({ data: projectsWithCardInfo, success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<Project> & { id: string } = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update project' },
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
