import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DEFAULT_LLM_MODEL } from '@/lib/openrouter'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { script, model, prompt } = await req.json()
    if (!script || typeof script !== 'string' || !script.trim()) {
      return NextResponse.json({ error: 'Invalid script' }, { status: 400 })
    }

    // System prompt to extract characters as structured JSON
    const system = `You are a helpful assistant that extracts a concise list of film/story characters from a provided script.
Return strictly valid JSON with this shape:
{
  "characters": [
    { "id": string, "name": string, "role": string, "description": string, "visualTraits": string }
  ]
}
Rules:
- Keep the list to 3-6 key characters.
- Keep fields short and information dense.
- id must be a slug: lower-case, hyphenated, unique.
- Do not include any extra fields or commentary.`

    const user = `SCRIPT:\n${script.slice(0, 8000)}\n\nExtra instructions (optional): ${typeof prompt === 'string' ? prompt.slice(0, 1000) : ''}\nPreferred model (hint only): ${typeof model === 'string' ? model : 'auto'}`

    const completion = await openrouter.chat.completions.create({
      model: DEFAULT_LLM_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = completion.choices?.[0]?.message?.content || '{}'
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Malformed AI response' }, { status: 502 })
    }

    const characters = Array.isArray(parsed?.characters) ? parsed.characters : []
    return NextResponse.json({ characters })
  } catch (error: unknown) {
    console.error('/api/characters/generate error:', error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
