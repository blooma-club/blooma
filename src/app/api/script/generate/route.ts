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

type ChatHistoryEntry = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const TOTAL_QUESTIONS = 5

const QUESTION_TOPICS = [
  "What they're creating (project type)",
  "Target audience demographics and psychographics",
  "Core message, emotion, or story to convey",
  "Visual style, mood, and aesthetic preferences",
  "Video length, format, and platform"
]

export async function POST(req: Request) {
  try {
    console.log('🎬 Script generation API called')

    const body = await req.json()
    const userScript: string = body.userScript || ''

    const incomingMessages: unknown[] = Array.isArray(body.messages) ? body.messages : []
    const parsedMessages = incomingMessages
      .map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return null
        const role = (entry as { role?: unknown }).role
        const content = (entry as { content?: unknown }).content
        if (
          (role === 'system' || role === 'user' || role === 'assistant') &&
          typeof content === 'string'
        ) {
          return { role, content } as ChatHistoryEntry
        }
        return null
      })
      .filter((entry): entry is ChatHistoryEntry => entry !== null)
    const messages = parsedMessages.length > 0 ? parsedMessages : null

    const settings: OptionalSettings = body.settings || {}
    const selectedModel: string = body.model || 'google/gemini-flash-1.5' // Default to Gemini Flash 1.5
    const questionMode: boolean = body.questionMode !== false // Default to true

    console.log('📝 Input data:', {
      userScriptLength: userScript.length,
      settings,
      model: selectedModel,
      messageCount: messages?.length || 0,
      questionMode
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
        .map((entry) => {
          const role = entry.role === 'assistant' ? 'Assistant' : entry.role === 'system' ? 'System' : 'User'
          const text = entry.content.trim()
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

    // Question-based mode: Ask questions before generating script
    if (questionMode && messages) {
      // Count how many user answers we have received
      const userMessages = messages.filter((m) => m.role === 'user')
      const answersCount = userMessages.length
      
      console.log(`🎯 Question mode - User has provided ${answersCount} answers`)
      
      // If we still need to ask questions (less than 5 total)
      if (answersCount > 0 && answersCount < TOTAL_QUESTIONS) {
        const nextQuestionNumber = answersCount + 1
        const nextTopic = QUESTION_TOPICS[answersCount]
        
        console.log(`🤖 Generating dynamic question ${nextQuestionNumber}/${TOTAL_QUESTIONS} about: ${nextTopic}`)
        
        // Build context for LLM to generate next question
        const conversationContext = messages
          .map((m) => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`)
          .join('\n')
        
        const questionPrompt = `You are an expert creative consultant helping a user plan their storyboard project.

Conversation so far:
${conversationContext}

Based on the user's answers, generate the next question (Question ${nextQuestionNumber}/${TOTAL_QUESTIONS}) about: ${nextTopic}

Your response should:
1. Provide a brief, relevant insight or recommendation (1-2 sentences) - keep it concise and actionable
2. Ask a clear, specific question that builds on their previous answers
3. Include helpful examples in parentheses

Format your response EXACTLY like this:

💡 [Your brief insight or recommendation based on their answer - 1-2 sentences max]

**Question:** [Your clear, direct question]
(Examples: [relevant examples separated by commas])

Keep the insight brief and the question crystal clear. Be conversational but structured.`

        const questionCompletion = await openrouter.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are a creative consultant helping plan video storyboard projects. Be insightful, conversational, and helpful.' },
            { role: 'user', content: questionPrompt }
          ],
          temperature: 0.8,
          max_tokens: 300,
        })

        const generatedQuestion = questionCompletion.choices?.[0]?.message?.content || ''
        
        if (!generatedQuestion || generatedQuestion.trim().length === 0) {
          throw new Error('Failed to generate next question')
        }

        console.log(`✅ Generated dynamic question: ${generatedQuestion.slice(0, 100)}...`)
        
        return NextResponse.json({
          script: generatedQuestion.trim(),
          isQuestion: true,
          questionNumber: nextQuestionNumber,
          totalQuestions: TOTAL_QUESTIONS,
          meta: {
            provider: 'openrouter',
            model: selectedModel,
            type: 'dynamic-question',
          },
        })
      }
      
      // All questions answered - generate final script
      console.log('✅ All questions answered - generating final script...')
    }

    console.log('🤖 Generating script with OpenRouter...')
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

## Title
- 1-2 sentences capturing the story premise and goal (include target audience & tone)

Shot: <number>
Shot Description: <concise action/visual summary optimized for AI image generation>
Camera Shot: <size/type>
Angle: <camera angle or movement>
Background: <location or set/background cues>
Mood/Lighting: <tone, lighting, color cues>
Dialogue / VO: <dialogue or narration; omit if none>
Sound: <SFX/music; omit if none>

[Repeat Shot block for each scene with Shot 2, Shot 3, etc.]

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
        if (entry.role && entry.content) {
          openRouterMessages.push({
            role: entry.role,
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
      isQuestion: false,
      isFinalScript: questionMode && messages ? true : false,
      meta: {
        provider: 'openrouter',
        model: selectedModel,
        tokens: script.length, // Approximate token count
      },
    })
  } catch (err: unknown) {
    console.error('/api/script/generate error:', {
      message: err instanceof Error ? err.message : undefined,
      status: err && typeof err === 'object' ? (err as { status?: unknown }).status : undefined,
      code: err && typeof err === 'object' ? (err as { code?: unknown }).code : undefined,
      type: err && typeof err === 'object' ? (err as { type?: unknown }).type : undefined,
      stack: err instanceof Error ? err.stack : undefined
    })
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Generation failed',
      details: err && typeof err === 'object' && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
        ? `API Error ${(err as { status: number }).status}`
        : 'Unknown error'
    }, { status: 500 })
  }
}
