import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { queryD1, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

/**
 * PATCH /api/cards/[id]
 * 
 * Updates background field for a specific card
 * Stores the background description as TEXT in D1
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: cardId } = await context.params
    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const background = body.background

    if (background === undefined) {
      return NextResponse.json(
        { error: 'background is required in request body' },
        { status: 400 }
      )
    }

    // Validate background is a string or null
    if (background !== null && typeof background !== 'string') {
      return NextResponse.json(
        { error: 'background must be a string or null' },
        { status: 400 }
      )
    }

    // Verify card exists and belongs to user
    const existingCard = await queryD1<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM cards WHERE id = ?1',
      [cardId]
    )

    if (existingCard.length === 0) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    if (existingCard[0].user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this card' },
        { status: 403 }
      )
    }

    // Update the card with background
    const updateSql = `
      UPDATE cards
      SET background = ?1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?2 AND user_id = ?3
    `

    await queryD1(updateSql, [background, cardId, userId])

    // Fetch updated card to return
    const updatedCard = await queryD1<{
      id: string
      background: string | null
      updated_at: string
    }>(
      'SELECT id, background, updated_at FROM cards WHERE id = ?1',
      [cardId]
    )

    return NextResponse.json({
      success: true,
      data: updatedCard[0],
    })
  } catch (error) {
    console.error('[PATCH /api/cards/[id]] Error updating background:', error)

    if (error instanceof D1ConfigurationError) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      )
    }

    if (error instanceof D1QueryError) {
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cards/[id]
 * 
 * Retrieves a specific card including background
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: cardId } = await context.params
    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      )
    }

    const cards = await queryD1<{
      id: string
      project_id: string
      user_id: string
      title: string
      content: string
      background?: string | null
      scene_number?: number | null
      shot_type?: string | null
      dialogue?: string | null
      image_url?: string | null
      created_at: string
      updated_at: string
    }>(
      'SELECT * FROM cards WHERE id = ?1 AND user_id = ?2',
      [cardId, userId]
    )

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cards[0],
    })
  } catch (error) {
    console.error('[GET /api/cards/[id]] Error fetching card:', error)

    if (error instanceof D1ConfigurationError) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      )
    }

    if (error instanceof D1QueryError) {
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
