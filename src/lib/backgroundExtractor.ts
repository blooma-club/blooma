/**
 * Background Extractor Service
 * 
 * Extracts and normalizes background/location descriptions from script text
 * to ensure consistent scene backgrounds across storyboard frames.
 * Uses LLM for intelligent background extraction when available.
 */

import { openrouter } from './openrouter'

export interface BackgroundCandidate {
  id: string
  description: string
  keywords: string[]
  sceneIndices: number[]
}

/**
 * Extract background using LLM for better semantic understanding
 */
async function extractBackgroundWithLLM(text: string): Promise<string | undefined> {
  if (!process.env.OPENROUTER_API_KEY) {
    return undefined
  }
  
  try {
    const prompt = `Extract the background/location/setting from this scene description. Return ONLY the background description (max 100 characters), nothing else.

Scene: ${text.slice(0, 500)}`
    
    const response = await Promise.race([
      openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You extract concise background/location descriptions from scene text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM timeout')), 10000)
      )
    ]) as Awaited<ReturnType<typeof openrouter.chat.completions.create>>
    
    const extracted = response.choices?.[0]?.message?.content?.toString().trim()
    if (extracted && extracted.length > 0 && extracted.length <= 200) {
      return extracted
    }
  } catch (error) {
    console.warn('[backgroundExtractor] LLM extraction failed:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  return undefined
}

/**
 * Extract background descriptions from parsed scenes
 * Returns a list of unique background candidates with their associated scenes
 */
export async function extractBackgrounds(scenes: Array<{
  order: number
  background?: string
  shotDescription?: string
  raw?: string
}>): Promise<BackgroundCandidate[]> {
  const backgroundMap = new Map<string, BackgroundCandidate>()
  
  for (const scene of scenes) {
    // Priority 1: Explicit background field
    let backgroundText = scene.background?.trim()
    
    // Priority 2: Extract using LLM for better understanding
    if (!backgroundText && process.env.OPENROUTER_API_KEY) {
      const sceneText = scene.shotDescription || scene.raw || ''
      if (sceneText) {
        backgroundText = await extractBackgroundWithLLM(sceneText)
      }
    }
    
    // Priority 3: Extract from shot description using patterns
    if (!backgroundText && scene.shotDescription) {
      backgroundText = extractBackgroundFromDescription(scene.shotDescription)
    }
    
    // Priority 4: Extract from raw text
    if (!backgroundText && scene.raw) {
      backgroundText = extractBackgroundFromDescription(scene.raw)
    }
    
    // Default fallback
    if (!backgroundText) {
      backgroundText = 'Generic indoor setting'
    }
    
    // Normalize the background description
    const normalized = normalizeBackground(backgroundText)
    
    // Check if we already have this background
    const existing = backgroundMap.get(normalized)
    
    if (existing) {
      // Add this scene to the existing background
      existing.sceneIndices.push(scene.order)
    } else {
      // Create new background candidate
      const keywords = extractKeywords(backgroundText)
      backgroundMap.set(normalized, {
        id: crypto.randomUUID(),
        description: backgroundText,
        keywords,
        sceneIndices: [scene.order],
      })
    }
  }
  
  return Array.from(backgroundMap.values())
}

/**
 * Extract background/location keywords from description text
 */
function extractBackgroundFromDescription(text: string): string | undefined {
  // Look for common location indicators
  const locationPatterns = [
    /(?:in|at|inside|outside|exterior|interior)\s+(?:a|an|the)?\s*([^,.;]+)/i,
    /(?:setting|location|background):\s*([^,.;]+)/i,
    /(?:takes place in|set in)\s+([^,.;]+)/i,
  ]
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }
  
  // Look for common location keywords
  const locationKeywords = [
    'forest', 'city', 'street', 'room', 'office', 'house', 'building',
    'park', 'beach', 'mountain', 'desert', 'ocean', 'lake', 'river',
    'classroom', 'restaurant', 'cafe', 'shop', 'store', 'mall',
    'hospital', 'airport', 'station', 'subway', 'train',
    'garden', 'yard', 'field', 'farm', 'barn',
  ]
  
  const lowerText = text.toLowerCase()
  for (const keyword of locationKeywords) {
    if (lowerText.includes(keyword)) {
      // Extract the phrase around the keyword
      const words = text.split(/\s+/)
      const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword))
      if (keywordIndex !== -1) {
        const start = Math.max(0, keywordIndex - 2)
        const end = Math.min(words.length, keywordIndex + 3)
        return words.slice(start, end).join(' ')
      }
    }
  }
  
  return undefined
}

/**
 * Normalize background descriptions to detect duplicates
 * Exported for use in validation
 */
export function normalizeBackground(background: string): string {
  return background
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract meaningful keywords from background description
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might',
  ])
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
  
  // Return unique keywords
  return Array.from(new Set(words))
}

/**
 * Find the best matching background for a given description
 */
export function findMatchingBackground(
  description: string,
  candidates: BackgroundCandidate[]
): BackgroundCandidate | undefined {
  if (candidates.length === 0) return undefined
  
  const keywords = extractKeywords(description)
  let bestMatch: { candidate: BackgroundCandidate; score: number } | undefined
  
  for (const candidate of candidates) {
    // Calculate similarity score based on keyword overlap
    const commonKeywords = keywords.filter(k => candidate.keywords.includes(k))
    const score = commonKeywords.length / Math.max(keywords.length, candidate.keywords.length)
    
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { candidate, score }
    }
  }
  
  // Only return if similarity is above threshold (30%)
  return bestMatch && bestMatch.score > 0.3 ? bestMatch.candidate : undefined
}

/**
 * Generate a new unique background description
 */
export function createUniqueBackground(description: string): BackgroundCandidate {
  return {
    id: crypto.randomUUID(),
    description,
    keywords: extractKeywords(description),
    sceneIndices: [],
  }
}

/**
 * Validate user input for custom background
 * Returns error message if invalid, undefined if valid
 */
export function validateBackgroundInput(input: string): string | undefined {
  // Check for empty or whitespace-only input
  const trimmed = input.trim()
  if (!trimmed) {
    return 'Background description cannot be empty'
  }
  
  // Check minimum length
  if (trimmed.length < 3) {
    return 'Background description must be at least 3 characters'
  }
  
  // Check maximum length
  if (trimmed.length > 200) {
    return 'Background description must be less than 200 characters'
  }
  
  // Check for invalid special characters
  const invalidChars = /[<>{}\[\]]/
  if (invalidChars.test(trimmed)) {
    return 'Background description contains invalid characters'
  }
  
  // Check for excessive punctuation
  const excessivePunctuation = /(!!!|\?\?\?|\.\.\.\.)/
  if (excessivePunctuation.test(trimmed)) {
    return 'Please use standard punctuation'
  }
  
  return undefined
}

/**
 * Check if a background description is duplicate or too similar to existing ones
 * Returns true if duplicate found
 */
export function isDuplicateBackground(
  description: string,
  existingBackgrounds: BackgroundCandidate[]
): boolean {
  const normalized = normalizeBackground(description)
  
  for (const existing of existingBackgrounds) {
    const existingNormalized = normalizeBackground(existing.description)
    
    // Exact match
    if (normalized === existingNormalized) {
      return true
    }
    
    // Very high similarity (> 90%)
    const similarity = calculateSimilarity(normalized, existingNormalized)
    if (similarity > 0.9) {
      return true
    }
  }
  
  return false
}

/**
 * Calculate similarity between two normalized strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/))
  const words2 = new Set(str2.split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}
