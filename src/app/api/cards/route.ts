import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CardInput } from '@/types'

// Extended type for database insertion
type CardInsert = CardInput & {
  storyboard_id: string
  user_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CardInsert | CardInsert[] = await request.json()
    
    if (Array.isArray(body)) {
      // Handle multiple cards
      if (body.length === 0) {
        return NextResponse.json(
          { error: 'At least one card is required' },
          { status: 400 }
        )
      }

      // Check if the database has timestamp columns by trying to insert without them first
      const cardsToInsert = body.map(card => {
        // Remove timestamp fields if they exist
        const { created_at, updated_at, ...cardWithoutTimestamps } = card as any
        // Round position and dimension values to integers for database compatibility
        return {
          ...cardWithoutTimestamps,
          position_x: Math.round(cardWithoutTimestamps.position_x || 0),
          position_y: Math.round(cardWithoutTimestamps.position_y || 0),
          width: Math.round(cardWithoutTimestamps.width || 400),
          height: Math.round(cardWithoutTimestamps.height || 220),
        }
      })

      const { data, error } = await supabase
        .from('cards')
        .insert(cardsToInsert)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to create cards', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, success: true })
    } else {
      // Handle single card
      if (!body.title || !body.storyboard_id || !body.user_id) {
        return NextResponse.json(
          { error: 'Title, storyboard_id, and user_id are required' },
          { status: 400 }
        )
      }

      // Remove timestamp fields for single card insert
      const { created_at, updated_at, ...cardWithoutTimestamps } = body as any
      
      // Round position and dimension values to integers for database compatibility
      const cardToInsert = {
        ...cardWithoutTimestamps,
        position_x: Math.round(cardWithoutTimestamps.position_x || 0),
        position_y: Math.round(cardWithoutTimestamps.position_y || 0),
        width: Math.round(cardWithoutTimestamps.width || 400),
        height: Math.round(cardWithoutTimestamps.height || 220),
      }

      const { data, error } = await supabase
        .from('cards')
        .insert(cardToInsert)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to create card', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, success: true })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: { cards: (CardInput & { id: string })[] } = await request.json()
    
    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0) {
      return NextResponse.json(
        { error: 'Cards array is required' },
        { status: 400 }
      )
    }

    // Update each card individually since Supabase doesn't support bulk upsert easily
    const updatePromises = body.cards.map(async (card) => {
      // Remove timestamp fields if they exist
      const { created_at, updated_at, ...cardWithoutTimestamps } = card as any
      
      const { data, error } = await supabase
        .from('cards')
        .update({
          title: cardWithoutTimestamps.title,
          content: cardWithoutTimestamps.content,
          user_input: cardWithoutTimestamps.user_input,
          type: cardWithoutTimestamps.type,
          image_urls: cardWithoutTimestamps.image_urls,
          selected_image_url: cardWithoutTimestamps.selected_image_url,
          position_x: Math.round(cardWithoutTimestamps.position_x),
          position_y: Math.round(cardWithoutTimestamps.position_y),
          width: Math.round(cardWithoutTimestamps.width),
          height: Math.round(cardWithoutTimestamps.height),
          order_index: cardWithoutTimestamps.order_index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    })

    const results = await Promise.all(updatePromises)

    return NextResponse.json({ data: results, success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to update cards' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body: { cardIds: string[] } = await request.json()
    
    if (!body.cardIds || !Array.isArray(body.cardIds) || body.cardIds.length === 0) {
      return NextResponse.json(
        { error: 'cardIds array is required' },
        { status: 400 }
      )
    }

    // Delete cards by IDs
    const { error } = await supabase
      .from('cards')
      .delete()
      .in('id', body.cardIds)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete cards', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deletedCount: body.cardIds.length })
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
    const storyboardId = searchParams.get('storyboard_id')
    const userId = searchParams.get('user_id')
    
    if (!storyboardId) {
      return NextResponse.json(
        { error: 'storyboard_id parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('cards')
      .select('*')
      .eq('storyboard_id', storyboardId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('order_index', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cards' },
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
