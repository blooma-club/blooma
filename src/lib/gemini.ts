import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI client
let genAI: GoogleGenerativeAI | null = null

export function initializeGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Gemini text generation will not work.')
    return null
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey)
    console.log('Gemini AI initialized successfully')
    return genAI
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error)
    return null
  }
}

// Get Gemini AI instance (lazy initialization)
export function getGeminiAI(): GoogleGenerativeAI | null {
  if (!genAI) {
    return initializeGemini()
  }
  return genAI
}

// Available Gemini models for text generation
export const GEMINI_MODELS = {
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Latest experimental Gemini model with fastest response times',
    maxTokens: 1048576,
    contextWindow: 2097152,
    cost: 'low'
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient model for quick text generation',
    maxTokens: 8192,
    contextWindow: 1048576,
    cost: 'low'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    description: 'Most capable model for complex reasoning and creative writing',
    maxTokens: 8192,
    contextWindow: 2097152,
    cost: 'medium'
  }
} as const

export type GeminiModelId = keyof typeof GEMINI_MODELS

// Default model for script generation
export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-2.0-flash-exp'

// Generate script using Gemini AI
export async function generateScriptWithGemini(
  prompt: string,
  modelId: GeminiModelId = DEFAULT_GEMINI_MODEL,
  options: {
    temperature?: number
    maxTokens?: number
    systemInstruction?: string
  } = {}
): Promise<{
  success: boolean
  script?: string
  error?: string
  meta?: {
    model: GeminiModelId
    elapsedTime: number
    tokens: number
    provider: 'gemini'
    originalError?: string
  }
}> {
  try {
    const client = getGeminiAI()
    if (!client) {
      throw new Error('Gemini AI is not properly configured')
    }

    const model = client.getGenerativeModel({ 
      model: modelId,
      systemInstruction: options.systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1200,
        topP: 0.8,
        topK: 40
      }
    })

    console.log(`[GEMINI] Generating script with model: ${modelId}`)
    console.log(`[GEMINI] Prompt length: ${prompt.length} characters`)

    const startTime = Date.now()
    const result = await model.generateContent(prompt)
    const elapsedTime = Date.now() - startTime

    const response = await result.response
    const script = response.text()

    if (!script || script.trim().length === 0) {
      throw new Error('Empty response from Gemini AI')
    }

    console.log(`[GEMINI] Script generated successfully in ${elapsedTime}ms`)
    console.log(`[GEMINI] Response length: ${script.length} characters`)

    return {
      success: true,
      script: script.trim(),
      meta: {
        model: modelId,
        elapsedTime,
        tokens: script.length, // Approximate token count
        provider: 'gemini'
      }
    }
  } catch (error: unknown) {
    console.error('[GEMINI] Script generation failed:', error)
    
    // Handle specific Gemini API errors
    let errorMessage = 'Script generation failed'
    
    if (error instanceof Error && error.message.includes('API_KEY_INVALID')) {
      errorMessage = 'Invalid Gemini API key. Please check your configuration.'
    } else if (error instanceof Error && error.message.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'Gemini API quota exceeded. Please try again later.'
    } else if (error instanceof Error && error.message.includes('SAFETY')) {
      errorMessage = 'Content was blocked by safety filters. Please modify your input.'
    } else if (error instanceof Error && error.message.includes('RECITATION')) {
      errorMessage = 'Content may contain copyrighted material. Please try a different approach.'
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      meta: {
        provider: 'gemini',
        model: modelId,
        elapsedTime: 0,
        tokens: 0,
        originalError: error instanceof Error ? error.message : undefined
      }
    }
  }
}

// Create enhanced system prompt for script generation
export function createGeminiSystemPrompt(language: string = 'English'): string {
  return `You are an award-winning creative director and senior storyboard writer specialized in creating production-ready scripts.

Your task: Generate or improve a storyboard script by combining the Brief (optional settings) and the User Script (if provided). Always output in ${language}.

Core Responsibilities:
- Transform creative briefs into detailed, actionable storyboard scripts
- Preserve user intent while enhancing clarity and production value
- Create visually compelling scene descriptions optimized for image generation
- Ensure consistency in tone, style, and messaging throughout

Input Analysis:
- Brief: Extract creative intent, genre, tone/mood, target audience, objective, key message, constraints
- User Script: Preserve core structure, intention, brand voice, and factual content while improving clarity

Hard Rules:
1) Respect constraints strictly. If constraints conflict with user script, prefer constraints but minimally adjust
2) If both Brief and User Script are empty, create a compact, high-quality default storyboard
3) Keep the script lean and immediately actionable for visual production (no meta commentary)
4) Aim for 6-12 shots unless content clearly needs fewer/more
5) Avoid clichés; write with clarity appropriate for specified audience and tone
6) Use production-friendly terminology throughout
7) Names/brands/locations: Keep them generic if not specified
8) Do not output JSON or code blocks. Output must be clean Markdown

Required Output Format (Markdown):

# Storyboard

## Summary
- 1-2 sentences capturing the story premise and goal (include target audience & tone)

## Shot
Shot #: <number>
Shot Description: <concise action/visual summary optimized for AI image generation>
Camera Shot: <size/type>
Angle: <camera angle or movement>
Background: <location or set/background cues>
Mood/Lighting: <tone, lighting, color cues>
Dialogue / VO: <dialogue or narration; omit if none>
Sound: <SFX/music; omit if none>

[Repeat Shot block for each scene]

Quality Standards:
- Each shot description should be vivid, specific, and optimized for AI image generation
- Camera work should be technically accurate and purposeful
- Dialogue should be natural and serve the story
- Sound design should enhance the visual narrative
- Overall flow should create a compelling visual story`
}

// Validate Gemini API configuration
export function validateGeminiConfig(): { isValid: boolean; error?: string } {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    return {
      isValid: false,
      error: 'GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is not set'
    }
  }

  if (apiKey.length < 20) {
    return {
      isValid: false,
      error: 'Gemini API key appears to be invalid (too short)'
    }
  }

  return { isValid: true }
}

// Get model information
export function getGeminiModelInfo(modelId: GeminiModelId) {
  return GEMINI_MODELS[modelId]
}

// List available models
export function getAvailableGeminiModels() {
  return Object.entries(GEMINI_MODELS).map(([id, info]) => ({
    id: id as GeminiModelId,
    ...info
  }))
}
