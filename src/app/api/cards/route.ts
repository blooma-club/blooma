import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CardInput } from '@/types'
import { deleteImageFromR2 } from '@/lib/r2'

// 허용 컬럼 화이트리스트 (DB 컬럼과 1:1 매핑)
const ALLOWED_KEYS = new Set([
  'id',
  'storyboard_id',
  'user_id',
  'type',
  'title',
  'content',
  'user_input',
  'image_url', // 단일 이미지 URL
  'image_urls', // 기존 배열 방식 (하위 호환성)
  'selected_image_url', // 기존 인덱스 방식 (하위 호환성)
  'image_key', // R2 키 (삭제용)
  'image_size', // 파일 크기
  'image_type', // uploaded/generated
  'order_index',
  'next_card_id',
  'prev_card_id',
  // 메타데이터 필드
  'scene_number',
  'shot_type',
  'dialogue',
  'sound',
  'image_prompt',
  'storyboard_status',
  'shot_description',
])

// Extended type for database insertion
type CardInsert = CardInput & {
  storyboard_id: string
  user_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CardInsert | CardInsert[] = await request.json()
    const allowedKeys = ALLOWED_KEYS
    
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
        const { created_at, updated_at, ...raw } = card as any
        // Pick only allowed keys
        const filtered = Object.fromEntries(
          Object.entries(raw).filter(([k]) => allowedKeys.has(k))
        ) as any
        // Normalize numeric fields
        if (typeof filtered.selected_image_url === 'number') {
          filtered.selected_image_url = Math.round(filtered.selected_image_url)
        }
        return filtered
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
      const { created_at, updated_at, ...raw } = body as any
      // Pick only allowed keys
      const filtered = Object.fromEntries(
        Object.entries(raw).filter(([k]) => allowedKeys.has(k))
      ) as any
      // Round position and dimension values to integers for database compatibility
      const cardToInsert = {
        ...filtered,
      }
      if (typeof cardToInsert.selected_image_url === 'number') {
        cardToInsert.selected_image_url = Math.round(cardToInsert.selected_image_url)
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
          image_url: cardWithoutTimestamps.image_url,
          image_urls: cardWithoutTimestamps.image_urls,
          selected_image_url: cardWithoutTimestamps.selected_image_url,
          image_key: cardWithoutTimestamps.image_key,
          image_size: cardWithoutTimestamps.image_size,
          image_type: cardWithoutTimestamps.image_type,
          order_index: cardWithoutTimestamps.order_index,
          // metadata + linking fields (persist storyboard edits)
          scene_number: cardWithoutTimestamps.scene_number,
          shot_type: cardWithoutTimestamps.shot_type,
          dialogue: cardWithoutTimestamps.dialogue,
          sound: cardWithoutTimestamps.sound,
          image_prompt: cardWithoutTimestamps.image_prompt,
          storyboard_status: cardWithoutTimestamps.storyboard_status,
          shot_description: cardWithoutTimestamps.shot_description,
          next_card_id: cardWithoutTimestamps.next_card_id,
          prev_card_id: cardWithoutTimestamps.prev_card_id,
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

    // 먼저 삭제할 카드들의 이미지 키를 가져옴
    const { data: cardsToDelete } = await supabase
      .from('cards')
      .select('image_key')
      .in('id', body.cardIds)

    // R2에서 이미지 삭제
    const imageKeys = cardsToDelete?.map(card => card.image_key).filter(Boolean) || []
    if (imageKeys.length > 0) {
      const deletePromises = imageKeys.map(key => deleteImageFromR2(key))
      await Promise.allSettled(deletePromises)
    }

    // 카드 삭제
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

    return NextResponse.json({ 
      success: true, 
      deletedCount: body.cardIds.length,
      deletedImages: imageKeys.length
    })
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
