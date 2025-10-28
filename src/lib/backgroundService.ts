/**
 * Background Service
 * 
 * Handles server communication for background metadata persistence
 * Updates cards table with background information
 */

import type { BackgroundMetadata } from './backgroundManager'

/**
 * Persist background metadata to server
 * Updates the cards table with background information
 */
export async function persistBackgroundMetadata(
  projectId: string,
  frameIndex: number,
  background: string | null,
  metadata?: BackgroundMetadata
): Promise<void> {
  try {
    const updatePayload = {
      cards: [{
        id: `frame-${frameIndex}`, // This should be the actual card ID
        background: background || null,
        // Store metadata as JSON string if needed in future
        // For now, just store the description
      }]
    }
    
    const response = await fetch('/api/cards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to persist background: ${response.statusText}`)
    }
    
    console.log('[backgroundService] Persisted background metadata:', {
      projectId,
      frameIndex,
      background: background?.slice(0, 50),
      isInherited: metadata?.isInherited,
    })
  } catch (error) {
    console.error('[backgroundService] Failed to persist background metadata:', error)
    throw error
  }
}

/**
 * Batch update backgrounds for multiple frames
 */
export async function batchPersistBackgrounds(
  updates: Array<{
    cardId: string
    background: string | null
    metadata?: BackgroundMetadata
  }>
): Promise<void> {
  if (updates.length === 0) return
  
  try {
    const updatePayload = {
      cards: updates.map(update => ({
        id: update.cardId,
        background: update.background || null,
      }))
    }
    
    const response = await fetch('/api/cards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to batch persist backgrounds: ${response.statusText}`)
    }
    
    console.log('[backgroundService] Batch persisted backgrounds:', {
      count: updates.length,
      inherited: updates.filter(u => u.metadata?.isInherited).length,
    })
  } catch (error) {
    console.error('[backgroundService] Failed to batch persist backgrounds:', error)
    throw error
  }
}

/**
 * Retrieve background metadata from server
 */
export async function fetchBackgroundMetadata(
  projectId: string
): Promise<Record<string, string>> {
  try {
    const response = await fetch(`/api/cards?project_id=${encodeURIComponent(projectId)}`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch backgrounds: ${response.statusText}`)
    }
    
    const result = await response.json()
    const cards = result.data || []
    
    // Build a map of cardId -> background
    const backgrounds: Record<string, string> = {}
    for (const card of cards) {
      if (card.background) {
        backgrounds[card.id] = card.background
      }
    }
    
    return backgrounds
  } catch (error) {
    console.error('[backgroundService] Failed to fetch background metadata:', error)
    return {}
  }
}
