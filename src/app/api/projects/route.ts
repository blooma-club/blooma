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
        is_public: false, // 모든 프로젝트는 Private로 고정
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
    console.log('GET /api/projects - Starting request')
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    console.log('GET /api/projects - userId:', userId)
    
    if (!userId) {
      console.log('GET /api/projects - Missing user_id parameter')
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      )
    }
    
    // First get all projects
    console.log('GET /api/projects - Fetching projects for user:', userId)
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('GET /api/projects - Supabase error details:', {
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

    console.log('GET /api/projects - Found projects:', projects?.length || 0)

    // For each project, get the first scene's image for preview
    const projectsWithPreview = await Promise.all(
      projects.map(async (project) => {
        // Check if project has storyboards
        console.log('GET /api/projects - Checking storyboards for project:', project.id)
        const { data: storyboards, error: storyboardsError } = await supabase
          .from('storyboards')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)

        if (storyboardsError) {
          console.error('GET /api/projects - Error fetching storyboards for project:', project.id, storyboardsError)
          return { ...project, has_cards: false, preview_image: null }
        }

        if (!storyboards || storyboards.length === 0) {
          return { ...project, has_cards: false, preview_image: null }
        }

        // Get the first card with an image from the first storyboard
        const { data: firstCard, error: cardError } = await supabase
          .from('cards')
          .select('image_url, image_urls, selected_image_url')
          .eq('storyboard_id', storyboards[0].id)
          .eq('user_id', userId)
          .order('order_index', { ascending: true })
          .limit(1)
          .single()

        if (cardError || !firstCard) {
          // Check if there are any cards at all
          const { data: anyCards, error: anyCardsError } = await supabase
            .from('cards')
            .select('id')
            .eq('storyboard_id', storyboards[0].id)
            .eq('user_id', userId)
            .limit(1)

          const hasCards = !anyCardsError && anyCards && anyCards.length > 0
          return { ...project, has_cards: hasCards, preview_image: null }
        }

        // Determine the preview image
        let previewImage = null
        if (firstCard.image_url) {
          previewImage = firstCard.image_url
        } else if (firstCard.image_urls && firstCard.image_urls.length > 0) {
          const selectedIndex = firstCard.selected_image_url || 0
          previewImage = firstCard.image_urls[selectedIndex] || firstCard.image_urls[0]
        }

        console.log('GET /api/projects - Project', project.id, 'has_cards: true, preview_image:', previewImage)

        return { 
          ...project, 
          has_cards: true, 
          preview_image: previewImage 
        }
      })
    )

    console.log('GET /api/projects - Returning', projectsWithPreview.length, 'projects')
    return NextResponse.json({ data: projectsWithPreview, success: true })
  } catch (error) {
    console.error('GET /api/projects - API error:', error)
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
