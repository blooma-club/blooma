import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deleteImageFromR2 } from '@/lib/r2'
import type { SupabaseCharacterInsert, SupabaseCharacterUpdate } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * GET /api/characters - Fetch characters
 * Query params: ?project_id=xxx (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Characters API] Error fetching characters:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ characters: data || [] })
  } catch (error) {
    console.error('[Characters API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/characters - Create new character
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const characterData: SupabaseCharacterInsert = {
      user_id: body.user_id,
      project_id: body.project_id || null,
      name: body.name,
      description: body.description || null,
      edit_prompt: body.edit_prompt || null,
      image_url: body.image_url || null,
      image_key: body.image_key || null,
      image_size: body.image_size || null,
      image_content_type: body.image_content_type || null,
      original_image_url: body.original_image_url || null,
      original_image_key: body.original_image_key || null,
      original_image_size: body.original_image_size || null,
    }

    console.log('[Characters API] Creating character:', {
      name: characterData.name,
      project_id: characterData.project_id,
      has_image: !!characterData.image_url
    })

    const { data, error } = await supabase
      .from('characters')
      .insert(characterData)
      .select()
      .single()

    if (error) {
      console.error('[Characters API] Error creating character:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Characters API] Successfully created character:', data.id)
    return NextResponse.json({ character: data })

  } catch (error) {
    console.error('[Characters API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/characters - Update character
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const characterId = body.id

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // Prepare update data (only include provided fields)
    const updateData: SupabaseCharacterUpdate = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.edit_prompt !== undefined) updateData.edit_prompt = body.edit_prompt
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.image_key !== undefined) updateData.image_key = body.image_key
    if (body.image_size !== undefined) updateData.image_size = body.image_size
    if (body.image_content_type !== undefined) updateData.image_content_type = body.image_content_type
    if (body.original_image_url !== undefined) updateData.original_image_url = body.original_image_url
    if (body.original_image_key !== undefined) updateData.original_image_key = body.original_image_key
    if (body.original_image_size !== undefined) updateData.original_image_size = body.original_image_size

    console.log('[Characters API] Updating character:', characterId)

    const { data, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)
      .select()
      .single()

    if (error) {
      console.error('[Characters API] Error updating character:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Characters API] Successfully updated character:', characterId)
    return NextResponse.json({ character: data })

  } catch (error) {
    console.error('[Characters API] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/characters - Delete character
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('id')

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // First, get the character to retrieve R2 keys for cleanup
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('image_key, original_image_key')
      .eq('id', characterId)
      .single()

    if (fetchError) {
      console.error('[Characters API] Error fetching character for deletion:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Delete from database first
    const { error: deleteError } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)

    if (deleteError) {
      console.error('[Characters API] Error deleting character:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Clean up R2 assets (non-blocking)
    const cleanupPromises = []
    if (character.image_key) {
      cleanupPromises.push(deleteImageFromR2(character.image_key))
    }
    if (character.original_image_key) {
      cleanupPromises.push(deleteImageFromR2(character.original_image_key))
    }

    // Don't await cleanup - let it happen in background
    if (cleanupPromises.length > 0) {
      Promise.allSettled(cleanupPromises).then((results) => {
        results.forEach((result, index) => {
          const key = index === 0 ? character.image_key : character.original_image_key
          if (result.status === 'rejected') {
            console.warn(`[Characters API] Failed to delete R2 asset ${key}:`, result.reason)
          } else {
            console.log(`[Characters API] Successfully deleted R2 asset: ${key}`)
          }
        })
      })
    }

    console.log('[Characters API] Successfully deleted character:', characterId)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Characters API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
