/**
 * Background Manager
 * 
 * Manages background consistency across storyboard scenes.
 * Maintains scene-level background state and ensures frames within
 * the same scene use consistent backgrounds.
 * Implements background inheritance using semantic comparison.
 */

import type { BackgroundCandidate } from './backgroundExtractor'
import { compareBackgrounds, SIMILARITY_THRESHOLD } from './backgroundComparator'

export interface BackgroundMetadata {
  id: string
  description: string
  keywords: string[]
  isInherited: boolean
  inheritedFrom?: string // Background ID that this was inherited from
}

export interface SceneBackground {
  sceneId: string
  sceneOrder: number
  selectedBackgroundId: string | null
  selectedBackgroundDescription: string | null
  metadata?: BackgroundMetadata
}

class BackgroundManager {
  private backgrounds: Map<string, BackgroundCandidate> = new Map()
  private sceneBackgrounds: Map<string, SceneBackground> = new Map()
  private previousBackground: BackgroundMetadata | null = null // For inheritance chain
  
  /**
   * Initialize backgrounds from extracted candidates
   */
  initializeBackgrounds(candidates: BackgroundCandidate[]): void {
    this.backgrounds.clear()
    for (const candidate of candidates) {
      this.backgrounds.set(candidate.id, candidate)
    }
  }
  
  /**
   * Get all available background candidates
   */
  getBackgrounds(): BackgroundCandidate[] {
    return Array.from(this.backgrounds.values())
  }
  
  /**
   * Get background by ID
   */
  getBackground(id: string): BackgroundCandidate | undefined {
    return this.backgrounds.get(id)
  }
  
  /**
   * Add a new background candidate
   */
  addBackground(candidate: BackgroundCandidate): void {
    this.backgrounds.set(candidate.id, candidate)
  }
  
  /**
   * Set background for a specific scene with metadata
   */
  setSceneBackground(
    sceneId: string,
    sceneOrder: number,
    backgroundId: string | null,
    metadata?: BackgroundMetadata
  ): void {
    const background = backgroundId ? this.backgrounds.get(backgroundId) : null
    
    this.sceneBackgrounds.set(sceneId, {
      sceneId,
      sceneOrder,
      selectedBackgroundId: backgroundId,
      selectedBackgroundDescription: background?.description || null,
      metadata,
    })
  }
  
  /**
   * Get background for a specific scene
   */
  getSceneBackground(sceneId: string): SceneBackground | undefined {
    return this.sceneBackgrounds.get(sceneId)
  }
  
  /**
   * Get background description for a scene
   */
  getSceneBackgroundDescription(sceneId: string): string | null {
    const sceneBackground = this.sceneBackgrounds.get(sceneId)
    return sceneBackground?.selectedBackgroundDescription || null
  }
  
  /**
   * Decide whether to inherit background from previous scene or create new one
   * Returns final background metadata with inheritance info
   */
  async decideBackgroundInheritance(
    currentBackgroundDescription: string,
    threshold: number = SIMILARITY_THRESHOLD
  ): Promise<BackgroundMetadata> {
    // No previous background - create new
    if (!this.previousBackground) {
      const metadata: BackgroundMetadata = {
        id: crypto.randomUUID(),
        description: currentBackgroundDescription,
        keywords: this.extractSimpleKeywords(currentBackgroundDescription),
        isInherited: false,
      }
      this.previousBackground = metadata
      return metadata
    }
    
    // Compare with previous background
    const similarity = await compareBackgrounds(
      this.previousBackground.description,
      currentBackgroundDescription
    )
    
    console.log('[BackgroundManager] Inheritance decision:', {
      previous: this.previousBackground.description.slice(0, 50),
      current: currentBackgroundDescription.slice(0, 50),
      similarity: similarity.toFixed(3),
      threshold,
      willInherit: similarity >= threshold,
    })
    
    // Inherit if similar enough
    if (similarity >= threshold) {
      const metadata: BackgroundMetadata = {
        id: this.previousBackground.id,
        description: this.previousBackground.description,
        keywords: this.previousBackground.keywords,
        isInherited: true,
        inheritedFrom: this.previousBackground.id,
      }
      // Don't update previousBackground - keep the original for next comparison
      return metadata
    }
    
    // Create new background
    const metadata: BackgroundMetadata = {
      id: crypto.randomUUID(),
      description: currentBackgroundDescription,
      keywords: this.extractSimpleKeywords(currentBackgroundDescription),
      isInherited: false,
    }
    this.previousBackground = metadata
    return metadata
  }
  
  /**
   * Extract simple keywords for metadata (internal use)
   */
  private extractSimpleKeywords(text: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
    ])
    
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !stopWords.has(word))
      )
    )
  }
  
  /**
   * Reset inheritance chain (call when switching projects or starting new storyboard)
   */
  resetInheritanceChain(): void {
    this.previousBackground = null
  }
  
  /**
   * Get the default background for a new frame in a scene
   * If the scene already has a background, use it
   * Otherwise, try to find a matching background from candidates
   */
  getDefaultBackgroundForScene(
    sceneId: string,
    sceneOrder: number,
    sceneDescription?: string
  ): BackgroundCandidate | undefined {
    // Check if scene already has an assigned background
    const existingBackground = this.sceneBackgrounds.get(sceneId)
    if (existingBackground?.selectedBackgroundId) {
      return this.backgrounds.get(existingBackground.selectedBackgroundId)
    }
    
    // Try to find a background that matches this scene order
    for (const background of this.backgrounds.values()) {
      if (background.sceneIndices.includes(sceneOrder)) {
        return background
      }
    }
    
    // Try to find a background based on description similarity
    if (sceneDescription) {
      const keywords = sceneDescription.toLowerCase().split(/\s+/)
      let bestMatch: { background: BackgroundCandidate; score: number } | undefined
      
      for (const background of this.backgrounds.values()) {
        const matchCount = keywords.filter(k => 
          background.keywords.some(bk => bk.includes(k) || k.includes(bk))
        ).length
        
        const score = matchCount / keywords.length
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { background, score }
        }
      }
      
      if (bestMatch && bestMatch.score > 0.2) {
        return bestMatch.background
      }
    }
    
    return undefined
  }
  
  /**
   * Clear all state
   */
  clear(): void {
    this.backgrounds.clear()
    this.sceneBackgrounds.clear()
    this.previousBackground = null
  }
  
  /**
   * Export state for serialization
   */
  export(): {
    backgrounds: BackgroundCandidate[]
    sceneBackgrounds: SceneBackground[]
  } {
    return {
      backgrounds: Array.from(this.backgrounds.values()),
      sceneBackgrounds: Array.from(this.sceneBackgrounds.values()),
    }
  }
  
  /**
   * Import state from serialized data
   */
  import(data: {
    backgrounds: BackgroundCandidate[]
    sceneBackgrounds: SceneBackground[]
  }): void {
    this.backgrounds.clear()
    this.sceneBackgrounds.clear()
    
    for (const bg of data.backgrounds) {
      this.backgrounds.set(bg.id, bg)
    }
    
    for (const sb of data.sceneBackgrounds) {
      this.sceneBackgrounds.set(sb.sceneId, sb)
    }
  }
}

// Singleton instance
const backgroundManager = new BackgroundManager()

export { backgroundManager }
