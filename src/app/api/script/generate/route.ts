import { NextResponse } from 'next/server'

// Ensure Node runtime and extend max duration so long LLM calls don't 502
export const runtime = 'nodejs'
export const maxDuration = 60
import { generateScriptWithGemini, createGeminiSystemPrompt, DEFAULT_GEMINI_MODEL, validateGeminiConfig } from '@/lib/gemini'

type OptionalSettings = {
  intent?: string
  genre?: string
  tone?: string
  audience?: string
  objective?: string
  keyMessage?: string
  language?: string
  constraints?: string
}

export async function POST(req: Request) {
  try {
    console.log('🎬 Script generation API called')
    
    const body = await req.json()
    const userScript: string = body.userScript || ''
    const settings: OptionalSettings = body.settings || {}
    const useGemini: boolean = body.useGemini !== false // Default to true

    console.log('📝 Input data:', { userScriptLength: userScript.length, settings, useGemini })

    const lang = settings.language || 'English'

    const briefLines: string[] = []
    if (settings.intent) briefLines.push(`What: ${settings.intent}`)
    if (settings.genre) briefLines.push(`Genre: ${settings.genre}`)
    if (settings.tone) briefLines.push(`Tone/Mood: ${settings.tone}`)
    if (settings.audience) briefLines.push(`Target: ${settings.audience}`)
    if (settings.objective) briefLines.push(`Objective: ${settings.objective}`)
    if (settings.keyMessage) briefLines.push(`Key Message: ${settings.keyMessage}`)
    if (settings.constraints) briefLines.push(`Constraints: ${settings.constraints}`)

    const briefBlock = briefLines.length ? `# Brief\n${briefLines.join('\n')}\n` : ''
    const scriptBlock = userScript?.trim() ? `\n# User Script\n${userScript}` : ''

    // Build content for the model: Brief + User Script only
    const content = `${briefBlock}${scriptBlock}`
    
    console.log('📋 Content for LLM:', content.slice(0, 500) + '...')

    if (!useGemini) {
      console.warn('⚠️ Gemini generation requested but disabled in payload; continuing with Gemini as the only supported provider.')
    }

    const geminiConfig = validateGeminiConfig()
    if (!geminiConfig.isValid) {
      console.error('❌ Gemini configuration invalid:', geminiConfig.error)
      return NextResponse.json(
        {
          error: geminiConfig.error || 'Gemini configuration missing',
          details: 'Script generation requires a valid Gemini API key',
        },
        { status: 500 }
      )
    }

    console.log('🤖 Generating script with Gemini 2.0 Flash...')
    const systemPrompt = createGeminiSystemPrompt(lang)
    const geminiResult = await generateScriptWithGemini(content, DEFAULT_GEMINI_MODEL, {
      temperature: 0.7,
      maxTokens: 1200,
      systemInstruction: systemPrompt,
    })

    if (!geminiResult.success || !geminiResult.script) {
      console.error('❌ Gemini generation failed:', geminiResult.error)
      return NextResponse.json(
        {
          error: geminiResult.error || 'Failed to generate script with Gemini',
          details: geminiResult.meta?.originalError,
        },
        { status: 502 }
      )
    }

    console.log('✅ Script generated successfully with Gemini')
    return NextResponse.json({
      script: geminiResult.script,
      meta: {
        ...(geminiResult.meta || {}),
        provider: 'gemini',
        model: DEFAULT_GEMINI_MODEL,
      },
    })
  } catch (err: any) {
    console.error('/api/script/generate error:', {
      message: err?.message,
      status: err?.status,
      code: err?.code,
      type: err?.type,
      stack: err?.stack
    })
    return NextResponse.json({ 
      error: err?.message || 'Generation failed',
      details: err?.status ? `API Error ${err.status}` : 'Unknown error'
    }, { status: 500 })
  }
}

