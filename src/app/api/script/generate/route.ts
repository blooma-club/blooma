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

type TransientStatus = 429 | 500 | 502 | 503 | 504

const TRANSIENT_STATUSES: number[] = [429, 500, 502, 503, 504]

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

async function withRetry<T>(fn: () => Promise<T>, opts: { retries?: number; baseDelay?: number } = {}) : Promise<T> {
  const { retries = 2, baseDelay = 600 } = opts
  let attempt = 0
  let lastErr: any
  while (true) {
    try { return await fn() } catch (err: any) {
      lastErr = err
      const status: number | undefined = err?.status || err?.code
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
2.  Create a clear and engaging **[Title]** for the video and place it at the very top of your response. If the input is clear, omit the title.
3.  Generate a storyboard script that is a maximum of **6 scenes**.
4.  The script must have a clear narrative arc: a strong **Hook** in Scene 1 and a clear **Call to Action (CTA)** in the final scene.
5.  Optimize the tone and pacing for platforms like TikTok and Reels.
6.  Use the following format for each scene:

**Scene #:**
**Shot Description:** (Dynamic, vivid and visual)
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
    const primaryModel = process.env.OPENROUTER_SCRIPT_MODEL || 'google/gemini-2.0-flash'
    const fallbackModel = process.env.OPENROUTER_SCRIPT_FALLBACK || 'google/gemini-2.0-flash'
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

    let completion: any
    try {
      completion = await attemptModel(primaryModel)
    } catch (primaryErr: any) {
      const status = primaryErr?.status || primaryErr?.code
      const transient = status && TRANSIENT_STATUSES.includes(status)
      if (transient) {
        try {
          completion = await attemptModel(fallbackModel)
        } catch (fallbackErr: any) {
          console.error('[script/generate] fallback failed', fallbackErr)
          return NextResponse.json({ error: 'Generation temporarily unavailable' }, { status: status === 429 ? 429 : 503 })
        }
      } else {
        console.error('[script/generate] primary non-transient error', primaryErr)
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
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
  } catch (err: any) {
    console.error('Script generation error', err)
    const status = err?.status || err?.code
    if (status && TRANSIENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Temporary service issue' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
