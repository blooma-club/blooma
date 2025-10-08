import { NextResponse } from 'next/server'

// Ensure Node runtime and extend max duration so long LLM calls don't 502
export const runtime = 'nodejs'
export const maxDuration = 60
import { openrouter } from '@/lib/openrouter'

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
    const messages = Array.isArray(body.messages) ? body.messages : null
    const settings: OptionalSettings = body.settings || {}
    const selectedModel: string = body.model || 'google/gemini-flash-1.5' // Default to Gemini Flash 1.5

    console.log('📝 Input data:', {
      userScriptLength: userScript.length,
      settings,
      model: selectedModel,
      messageCount: messages?.length || 0
    })

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

    let chatBlock = ''
    if (messages && messages.length > 0) {
      chatBlock = messages
        .map((entry: any) => {
          const role = entry?.role === 'assistant' ? 'Assistant' : 'User'
          const text = typeof entry?.content === 'string' ? entry.content.trim() : ''
          return text ? `${role}: ${text}` : ''
        })
        .filter(Boolean)
        .join('\n')
    }

    // Build content for the model: Brief + Chat history or user script
    const content = chatBlock ? `${briefBlock}${chatBlock}` : `${briefBlock}${scriptBlock}`

    console.log('📋 Content for LLM:', content.slice(0, 500) + '...')

    // OpenRouter 설정 검증
    const openRouterConfigured = !!process.env.OPENROUTER_API_KEY?.trim()?.length
    if (!openRouterConfigured) {
      console.error('❌ OpenRouter API key is not configured')
      return NextResponse.json(
        {
          error: 'OpenRouter API key is not configured',
          details: 'Script generation requires a valid OpenRouter API key',
        },
        { status: 500 }
      )
    }

    console.log('🤖 Generating script with OpenRouter (ChatGPT-5)...')
    const systemPrompt = `You are an award-winning creative director and senior storyboard writer specialized in creating production-ready scripts.

Your task: Generate or improve a storyboard script by combining the Brief (optional settings) and the User Script (if provided). Always output in ${lang}.

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

    const openRouterMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      { role: 'system', content: systemPrompt }
    ]

    // 메시지 히스토리가 있으면 추가
    if (messages && messages.length > 0) {
      for (const entry of messages) {
        if (entry?.role && entry?.content) {
          openRouterMessages.push({
            role: entry.role as 'system' | 'user' | 'assistant',
            content: entry.content
          })
        }
      }
    }

    // 사용자 메시지 추가
    if (content.trim()) {
      openRouterMessages.push({
        role: 'user',
        content: content
      })
    }

    const completion = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: openRouterMessages,
      temperature: 0.7,
      max_tokens: 1200,
    })

    const script = completion.choices?.[0]?.message?.content || ''

    if (!script || script.trim().length === 0) {
      console.error('❌ OpenRouter returned empty response')
      return NextResponse.json(
        {
          error: 'Empty response from OpenRouter',
          details: 'The AI model did not return any script content',
        },
        { status: 502 }
      )
    }

    console.log(`✅ Script generated successfully with OpenRouter (${selectedModel})`)
    return NextResponse.json({
      script: script.trim(),
      meta: {
        provider: 'openrouter',
        model: selectedModel,
        tokens: script.length, // Approximate token count
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
