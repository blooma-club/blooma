/**
 * Background Comparator
 * 
 * Compares background descriptions using semantic similarity:
 * 1. LLM chat-based comparison (using openai/gpt-oss-20b:free)
 * 2. Embeddings + cosine similarity (fallback if available)
 * 3. Jaccard similarity (final fallback)
 */

import { openrouter, DEFAULT_EMBEDDING_MODEL } from './openrouter'

export const SIMILARITY_THRESHOLD = 0.6

// Free model for LLM-based comparison
const FREE_LLM_MODEL = 'openai/gpt-oss-20b:free' // Auto-routes to free models

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (!denom || !Number.isFinite(denom)) return 0
  
  return dot / denom
}

/**
 * Calculate Jaccard similarity between two text strings (fallback method)
 */
function jaccardSimilarity(textA: string, textB: string): number {
  const tokenize = (text: string) => 
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    )
  
  const setA = tokenize(textA)
  const setB = tokenize(textB)
  
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  
  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Compare backgrounds using LLM chat (free method)
 * Returns similarity score 0-1
 */
async function compareWithLLM(textA: string, textB: string): Promise<number | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[backgroundComparator] OPENROUTER_API_KEY not found, skipping LLM comparison')
    return null
  }
  
  try {
    const prompt = `Compare these two background/location descriptions and rate their similarity from 0 to 100.
Return ONLY a number (0-100), nothing else.

Background A: "${textA}"
Background B: "${textB}"

Similarity score (0-100):`
    
    const res = await Promise.race([
      openrouter.chat.completions.create({
        model: FREE_LLM_MODEL,
        messages: [
          { role: 'system', content: 'You are a semantic similarity analyzer. Return only a number from 0 to 100. No explanation needed.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100, // Increased to allow reasoning models to complete
        temperature: 0,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM timeout')), 10000)
      )
    ]) as Awaited<ReturnType<typeof openrouter.chat.completions.create>>
    
    // Extract response from content or reasoning field
    const message = res.choices?.[0]?.message
    let response = message?.content?.toString().trim() || ''
    
    // If content is empty, try reasoning field (for reasoning models)
    if (!response && (message as any)?.reasoning) {
      response = (message as any).reasoning.toString().trim()
    }
    
    // Extract first number found in response
    const numberMatch = response.match(/\d+/)
    const score = numberMatch ? parseInt(numberMatch[0], 10) : 0
    
    console.log('[backgroundComparator] LLM parsed:', {
      model: FREE_LLM_MODEL,
      rawResponse: response.slice(0, 100),
      extractedScore: score,
    })
    
    if (isNaN(score) || score < 0 || score > 100) {
      console.warn('[backgroundComparator] Invalid LLM score:', { response: response.slice(0, 100), score })
      return null
    }
    
    // Convert 0-100 to 0-1
    return score / 100
  } catch (error) {
    console.warn('[backgroundComparator] LLM comparison failed:', error instanceof Error ? error.message : 'Unknown error')
    if (error instanceof Error && error.stack) {
      console.warn('[backgroundComparator] Error stack:', error.stack.slice(0, 300))
    }
    return null
  }
}

/**
 * Get embedding vector for text using LLM API
 */
async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    return null
  }
  
  try {
    const res = await openrouter.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text,
    })
    
    // OpenAI-style response format
    const embedding = res?.data?.[0]?.embedding || res?.embedding || null
    
    return Array.isArray(embedding) ? embedding : null
  } catch (error) {
    console.warn('[backgroundComparator] Embedding API failed:', error)
    return null
  }
}

/**
 * Compare two background descriptions and return similarity score
 * Uses LLM embeddings when available, falls back to Jaccard similarity
 */
export async function compareBackgrounds(
  prevBackground: string,
  currentBackground: string
): Promise<number> {
  // Normalize inputs
  const prev = prevBackground.trim()
  const curr = currentBackground.trim()
  
  // Exact match
  if (prev.toLowerCase() === curr.toLowerCase()) {
    return 1.0
  }
  
  // Method 1: Try LLM-based comparison (free)
  try {
    const llmScore = await compareWithLLM(prev, curr)
    if (llmScore !== null) {
      console.log('[backgroundComparator] LLM similarity:', {
        prev: prev.slice(0, 50),
        curr: curr.slice(0, 50),
        score: llmScore.toFixed(3),
        method: 'LLM-chat',
      })
      return llmScore
    }
  } catch (error) {
    console.warn('[backgroundComparator] LLM comparison failed:', error)
  }
  
  // Method 2: Try semantic comparison with embeddings (if available)
  try {
    const [embeddingA, embeddingB] = await Promise.all([
      embedText(prev),
      embedText(curr),
    ])
    
    if (embeddingA && embeddingB) {
      const similarity = cosineSimilarity(embeddingA, embeddingB)
      console.log('[backgroundComparator] Embedding similarity:', {
        prev: prev.slice(0, 50),
        curr: curr.slice(0, 50),
        score: similarity.toFixed(3),
        method: 'embeddings',
      })
      return similarity
    }
  } catch (error) {
    console.warn('[backgroundComparator] Embedding comparison failed:', error)
  }
  
  // Method 3: Fallback to keyword-based Jaccard similarity
  const fallbackScore = jaccardSimilarity(prev, curr)
  console.log('[backgroundComparator] Fallback similarity:', {
    prev: prev.slice(0, 50),
    curr: curr.slice(0, 50),
    score: fallbackScore.toFixed(3),
    method: 'jaccard',
  })
  
  return fallbackScore
}

/**
 * Determine if two backgrounds represent the same location
 */
export async function isSameLocation(
  prevBackground: string,
  currentBackground: string,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<boolean> {
  const similarity = await compareBackgrounds(prevBackground, currentBackground)
  return similarity >= threshold
}

/**
 * Batch compare current background against multiple previous backgrounds
 * Returns the index of the best match if above threshold, otherwise -1
 */
export async function findBestMatch(
  currentBackground: string,
  previousBackgrounds: string[],
  threshold: number = SIMILARITY_THRESHOLD
): Promise<{ index: number; score: number } | null> {
  if (previousBackgrounds.length === 0) {
    return null
  }
  
  const scores = await Promise.all(
    previousBackgrounds.map(prev => compareBackgrounds(prev, currentBackground))
  )
  
  let bestIndex = -1
  let bestScore = 0
  
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i]
      bestIndex = i
    }
  }
  
  if (bestScore >= threshold) {
    return { index: bestIndex, score: bestScore }
  }
  
  return null
}
