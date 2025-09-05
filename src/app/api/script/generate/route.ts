import { NextResponse } from 'next/server'
import { openrouter } from '@/lib/openrouter'

// ---- Runtime Guards & Helpers -------------------------------------------------
const REQUIRED_ENV: Array<{ key: string; optional?: boolean }> = [
  { key: 'OPENROUTER_API_KEY' }
]

for (const { key, optional } of REQUIRED_ENV) {
  if (!optional && !process.env[key]) {
    // Throwing during module load will surface a clear error early.
    throw new Error(`[script/generate] Missing required env var ${key}`)
  }
}

const TRANSIENT_STATUSES: number[] = [429, 500, 502, 503, 504]

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

async function withRetry<T>(fn: () => Promise<T>, opts: { retries?: number; baseDelay?: number } = {}) : Promise<T> {
  const { retries = 2, baseDelay = 600 } = opts
  let attempt = 0
  let lastErr: Error | unknown
  while (true) {
    try { return await fn() } catch (err: unknown) {
      lastErr = err
      const status: number | undefined = (err as { status?: number; code?: number })?.status || (err as { status?: number; code?: number })?.code
      if (attempt < retries && status && TRANSIENT_STATUSES.includes(status)) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.round(Math.random()*100)
        await sleep(delay)
        attempt++
        continue
      }
      throw lastErr
    }
  }
}

// Basic system instruction for initial script generation
const SYSTEM_PROMPT = `You are a silent, efficient short-form video script engine.
Your entire response must consist ONLY of the final script. Do not write any greetings, explanations, or text outside of the specified output structure.

**Instructions:**
1.  Detect the language of the user's input and write the entire output in that language.
2.  Create a clear and engaging **[Title]** for the video.
3.  Generate a storyboard script (max 6 scenes) with a clear **Hook → CTA** narrative arc.
4.  Optimize for TikTok/Reels pacing.
5.  **Adhere to the following Quality Standard for [Shot Description]:**
    * **Goal:** The description must be a cinematic snapshot. It should paint a complete picture with words, allowing a director to perfectly visualize the scene.
    * **AVOID (Bad Example):** "A person drinks coffee."
    * **DO THIS (Good Example):** "Sunlight streams through a window, illuminating steam rising from a ceramic mug as a person gently blows on the hot coffee, their face reflecting a quiet morning peace."
6.  Use the following format:

**Scene #:**
**Shot Description:** (A cinematic snapshot adhering to the quality standard)
**Shot:** (e.g., Close-up, Medium Shot)
**Angle:** (e.g., Eye level, Low angle)
**Dialogue/VO:** (Spoken words, narration, or "No dialogue")
**Sound:** (Specific SFX or BGM style)
`;

export async function POST(req: Request) {
  const started = Date.now()
  try {
    // 1. Parse & validate body
    const body = await req.json().catch(() => ({}))
    const briefRaw = (body.brief ?? '').toString()
    const toneRaw = body.tone ? body.tone.toString() : ''
    const lengthRaw = body.length ? body.length.toString() : ''

    const trimSafe = (v: string) => v.replace(/\s+/g, ' ').trim()
    const brief = trimSafe(briefRaw)
    if (!brief) return NextResponse.json({ error: 'Missing brief' }, { status: 400 })
    if (brief.length > 800) return NextResponse.json({ error: 'Brief too long (max 800 chars)' }, { status: 413 })

    const tone = toneRaw ? trimSafe(toneRaw).slice(0, 60) : undefined
    const desiredLength = lengthRaw ? trimSafe(lengthRaw).slice(0, 40) : undefined

    // 2. Construct user prompt
    const userPromptLines: string[] = [ `Brief: ${brief}` ]
    if (tone) userPromptLines.push(`Tone: ${tone}`)
    if (desiredLength) userPromptLines.push(`Desired length: ${desiredLength}`)
    userPromptLines.push('Generate a storyboard script now.')
    const userPrompt = userPromptLines.join('\n')

    // 3. Model selection & fallback
  // Use specific known-good model ids by default. Allow override via env.
  const primaryModel = process.env.OPENROUTER_SCRIPT_MODEL || 'google/gemini-2.0-flash-001'
  const fallbackModel = process.env.OPENROUTER_SCRIPT_FALLBACK || 'google/gemini-2.0-flash-001'
    const temperature = 0.3
    const maxTokens = 1400

    // 4. Core call with retry and fallback
    const attemptModel = async (model: string) => withRetry(() => openrouter.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      top_p: 0.95,
      max_tokens: maxTokens,
    }), { retries: 2 })

    let completion: {
      choices: Array<{ message?: { content?: string | null } }>;
      model?: string;
    }
    try {
      completion = await attemptModel(primaryModel)
    } catch (primaryErr: unknown) {
      const status = (primaryErr as { status?: number; code?: number })?.status || (primaryErr as { status?: number; code?: number })?.code
      const transient = status && TRANSIENT_STATUSES.includes(status)
      if (transient) {
        try {
          completion = await attemptModel(fallbackModel)
        } catch (fallbackErr: unknown) {
          console.error('[script/generate] fallback failed', fallbackErr)
          return NextResponse.json({ error: 'Generation temporarily unavailable' }, { status: status === 429 ? 429 : 503 })
        }
      } else {
        console.error('[script/generate] primary non-transient error', primaryErr)
        // If the provider returned a 400 (bad request / invalid model id), pass a helpful message to the client.
        const status = (primaryErr as { status?: number; code?: number })?.status || (primaryErr as { status?: number; code?: number })?.code || 500
        const message = (primaryErr as { message?: string })?.message || 'Generation failed'
        return NextResponse.json({ error: `Generation failed: ${message}` }, { status: status })
      }
    }

    // 5. Validate response structure
    if (!completion || !Array.isArray(completion.choices) || completion.choices.length === 0) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 502 })
    }
    const scriptRaw = completion.choices[0]?.message?.content
    const script = typeof scriptRaw === 'string' ? scriptRaw.trim() : ''
    if (!script) return NextResponse.json({ error: 'No content returned from model' }, { status: 502 })

    // 6. Basic post-validation: ensure at least one Scene label present
    if (!/Scene\s*1/i.test(script)) {
      // Not failing hard; just flagging vulnerability of generation
      console.warn('[script/generate] script missing Scene 1 marker')
    }

    return NextResponse.json({ script, meta: { model: completion.model, latencyMs: Date.now() - started } })
  } catch (err: unknown) {
    console.error('Script generation error', err)
    const status = (err as { status?: number; code?: number })?.status || (err as { status?: number; code?: number })?.code
    if (status && TRANSIENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Temporary service issue' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
