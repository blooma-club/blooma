import { NextResponse } from 'next/server'

// Ensure Node runtime and extend max duration so long LLM calls don't 502
export const runtime = 'nodejs'
export const maxDuration = 60
import { generateScriptWithGemini, createGeminiSystemPrompt, DEFAULT_GEMINI_MODEL, validateGeminiConfig } from '@/lib/gemini'
// Keep OpenRouter as fallback
import { openrouter, DEFAULT_LLM_MODEL } from '@/lib/openrouter'

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

    // Try Gemini first, fallback to OpenRouter if needed
    if (useGemini) {
      console.log('🤖 Attempting script generation with Gemini AI...')
      
      const geminiConfig = validateGeminiConfig()
      if (geminiConfig.isValid) {
        const systemPrompt = createGeminiSystemPrompt(lang)
        
        const geminiResult = await generateScriptWithGemini(
          content,
          DEFAULT_GEMINI_MODEL,
          {
            temperature: 0.7,
            maxTokens: 1200,
            systemInstruction: systemPrompt
          }
        )
        
        if (geminiResult.success && geminiResult.script) {
          console.log('✅ Script generated successfully with Gemini')
          return NextResponse.json({ 
            script: geminiResult.script, 
            meta: { 
              ...geminiResult.meta,
              provider: 'gemini',
              model: DEFAULT_GEMINI_MODEL
            } 
          })
        } else {
          console.warn('⚠️ Gemini generation failed, falling back to OpenRouter:', geminiResult.error)
        }
      } else {
        console.warn('⚠️ Gemini not properly configured, using OpenRouter:', geminiConfig.error)
      }
    }

    // Fallback to OpenRouter
    console.log('🤖 Using OpenRouter as fallback...')
    const systemPrompt = `You are an award‑winning creative director and senior storyboard writer.

Your task: Generate or improve a production‑ready storyboard script by combining the Brief (optional settings) and the User Script (if provided). Always output in ${lang}.

Input signals you must use:
- Brief: Creative intent, genre, tone/mood, target audience, objective, key message, constraints. Treat constraints as hard requirements.
- User Script: If provided, preserve core structure, intention, brand voice, and factual content. You may tighten, reorder for pacing, and elevate clarity without losing meaning.

Hard rules:
1) Respect constraints strictly. If constraints conflict with user script, prefer constraints but minimally adjust the script to reconcile.
2) If both Brief and User Script are empty, infer minimally and produce a compact, high‑quality default storyboard.
3) Keep the script lean, immediately actionable for visual production (no meta commentary). Aim for 6–12 shots unless the content clearly needs fewer/more.
4) Avoid clichés; write with clarity appropriate for the specified audience and tone. Keep terminology production‑friendly.
5) Names/brands/locations: If not specified, keep them generic.
6) Do not output JSON. Output must be Markdown with the exact labels below.

Output format (Markdown). For each shot, repeat the following block:

## Shot
Shot #: <number>
Shot Description: <concise action/visual summary>
Camera Shot: <size/type>
Angle: <camera angle or movement>
Background: <location or set/background cues>
Mood/Lighting: <tone, lighting, color cues>
Dialogue / VO: <dialogue or narration; omit if none>
Sound: <SFX/music; omit if none>

Begin the document with:

# Storyboard

## Summary
- 1–2 sentences capturing the story premise and goal (include target audience & tone).
`

    console.log('🤖 Calling OpenRouter with model:', DEFAULT_LLM_MODEL)
    
    const completion = await openrouter.chat.completions.create({
      model: DEFAULT_LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content }
      ],
      // OpenRouter SDK (OpenAI compat) may not accept provider-specific fields; keep to standard fields
      temperature: 0.7,
      max_tokens: 1200
    }, {
      timeout: 60000 // 60초 타임아웃
    })

    console.log('🎯 OpenRouter response received:', {
      hasChoices: !!completion.choices,
      choicesLength: completion.choices?.length || 0,
      firstChoiceContent: completion.choices?.[0]?.message?.content?.slice(0, 200),
      fullFirstChoice: completion.choices?.[0],
      fullMessage: completion.choices?.[0]?.message
    })

    // 일부 모델/프로바이더는 message.content를 문자열이 아닌 배열(part)로 반환할 수 있으므로 방어적으로 추출
    // GPT-5는 reasoning 필드에 실제 답변을 넣고 content는 비워둘 수 있음
    const normalizeContent = (msg: any): string => {
      console.log('🔍 Normalizing content from message:', msg)
      
      const c = msg?.content
      const reasoning = msg?.reasoning
      
      // GPT-5의 경우 reasoning 필드에 실제 답변이 있을 수 있음
      if (reasoning && typeof reasoning === 'string' && reasoning.trim()) {
        console.log('✅ Reasoning content found (GPT-5 style):', reasoning.slice(0, 100))
        return reasoning.trim()
      }
      
      if (!c) {
        console.log('❌ No content found in message')
        return ''
      }
      
      if (typeof c === 'string') {
        console.log('✅ String content found:', c.slice(0, 100))
        return c.trim()
      }
      
      if (Array.isArray(c)) {
        console.log('📋 Array content found, length:', c.length)
        const texts = c.map((p: any) => {
          if (typeof p === 'string') return p
          if (typeof p?.text === 'string') return p.text
          if (typeof p?.content === 'string') return p.content
          return ''
        })
        const result = texts.filter(Boolean).join('\n').trim()
        console.log('📋 Array content result:', result.slice(0, 100))
        return result
      }
      
      console.log('❌ Unknown content type:', typeof c)
      return ''
    }

    let script = ''
    if (Array.isArray(completion?.choices) && completion.choices.length > 0) {
      for (const ch of completion.choices) {
        const t = normalizeContent(ch?.message)
        if (t) { script = t; break }
      }
    }

    // 코드펜스로 감싼 출력 방지
    if (script) {
      script = script.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim()
    }

    console.log('📄 Final script:', {
      length: script.length,
      preview: script.slice(0, 300),
      isEmpty: !script
    })

    if (!script) {
      console.warn('⚠️ Empty script after first try — retrying once with explicit instruction')
      const retry = await openrouter.chat.completions.create({
        model: DEFAULT_LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Output the final storyboard now in Markdown. Do not include any reasoning or commentary.' },
          { role: 'user', content }
        ],
        // Keep standard fields only
        temperature: 0.5,
        max_tokens: 1400
      }, { timeout: 60000 })

      console.log('🎯 Retry response received:', {
        hasChoices: !!retry.choices,
        choicesLength: retry.choices?.length || 0,
        firstChoiceContent: retry.choices?.[0]?.message?.content?.slice(0, 200)
      })

      if (Array.isArray(retry?.choices) && retry.choices.length > 0) {
        for (const ch of retry.choices) {
          const t = normalizeContent(ch?.message)
          if (t) { script = t; break }
        }
        if (script) {
          script = script.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim()
        }
      }
    }

    if (!script) {
      console.error('❌ Empty script after processing (including retry)')
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 })
    }

    console.log('✅ Returning script to client')
    return NextResponse.json({ script, meta: { provider: 'openrouter', model: DEFAULT_LLM_MODEL } })
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


