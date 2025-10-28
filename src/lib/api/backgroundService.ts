/**
 * Background Service - Client Side
 * 
 * Client-side service for updating and retrieving background text
 * Communicates with PATCH /api/cards/[id] endpoint
 */

import type { BackgroundMetadata } from '../backgroundManager'

/**
 * Update card background text via PATCH endpoint
 * 
 * @param cardId - The card ID to update
 * @param background - Background description text
 * @returns Updated card data
 */
export async function updateCardBackground(
  cardId: string,
  background: string | null
): Promise<{
  success: boolean
  data?: {
    id: string
    background: string | null
    updated_at: string
  }
  error?: string
}> {
  try {
    const response = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        background,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update card background')
    }

    return result
  } catch (error) {
    console.error('[backgroundService] Failed to update card background:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get card with background
 * 
 * @param cardId - The card ID to retrieve
 * @returns Card data including background
 */
export async function getCardWithBackground(cardId: string): Promise<{
  success: boolean
  data?: {
    id: string
    background?: string | null
    [key: string]: any
  }
  error?: string
}> {
  try {
    const response = await fetch(`/api/cards/${cardId}`, {
      method: 'GET',
      credentials: 'include',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch card')
    }

    return result
  } catch (error) {
    console.error('[backgroundService] Failed to fetch card:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch update multiple cards with background text
 * 
 * @param updates - Array of card updates with background text
 * @returns Results of batch update
 */
export async function batchUpdateBackgrounds(
  updates: Array<{
    cardId: string
    background: string | null
  }>
): Promise<{
  success: boolean
  results: Array<{
    cardId: string
    success: boolean
    error?: string
  }>
}> {
  const results = await Promise.all(
    updates.map(async ({ cardId, background }) => {
      const result = await updateCardBackground(cardId, background)
      return {
        cardId,
        success: result.success,
        error: result.error,
      }
    })
  )

  const allSucceeded = results.every((r) => r.success)

  return {
    success: allSucceeded,
    results,
  }
}

/**
 * Persist background text after storyboard frame creation
 * Integrates with existing storyboard engine
 * 
 * @param cardId - Card/Frame ID
 * @param metadata - Background metadata from inheritance system
 */
export async function persistFrameBackground(
  cardId: string,
  metadata: BackgroundMetadata
): Promise<void> {
  const background = metadata.description
  
  const result = await updateCardBackground(cardId, background)
  
  if (!result.success) {
    console.error(`[backgroundService] Failed to persist frame background for ${cardId}:`, result.error)
    throw new Error(result.error || 'Failed to persist background')
  }
  
  console.log(`[backgroundService] Successfully persisted background for frame ${cardId}`, {
    isInherited: metadata.isInherited,
    background: background?.slice(0, 50),
  })
}
