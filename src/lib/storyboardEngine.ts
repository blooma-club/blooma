import { parseScript, ParsedScene, extractTitle, stripTitle } from './scriptParser'
import { openrouter } from './openrouter'
import { EventEmitter } from 'events'
import { fal } from '@fal-ai/client'

export interface FrameRecord {
  id: string
  storyboardId: string
  sceneOrder: number
  order: number
  baseDescription: string
  title?: string
  shotType?: string
  dialogue?: string
  sound?: string
  enhancedDescription?: string
  imagePrompt?: string
  imageUrl?: string
  status: 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error'
  error?: string
}

export interface StoryboardRecord {
  id: string
  projectId?: string
  script: string
  aspectRatio: string
  style: string
  createdAt: number
  status: 'pending' | 'processing' | 'ready' | 'partial' | 'error'
  frames: FrameRecord[]
  title?: string
}

const storyboards = new Map<string, StoryboardRecord>()
const storyboardEmitters = new Map<string, EventEmitter>()

function ensureEmitter(id: string) {
  let em = storyboardEmitters.get(id)
  if (!em) { em = new EventEmitter(); storyboardEmitters.set(id, em) }
  return em
}

export function getStoryboardEmitter(id: string) {
  return ensureEmitter(id)
}

export function getStoryboardRecord(id: string) {
  return storyboards.get(id) || null
}

export function getStoryboardStatus(id: string) {
  const sb = storyboards.get(id)
  if (!sb) return null
  const ready = sb.frames.filter((f) => f.status === 'ready').length
  return { storyboardId: sb.id, status: sb.status, readyCount: ready, total: sb.frames.length }
}

export async function createStoryboard(params: {
  projectId?: string
  rawScript: string
  aspectRatio: string
  style: string
  processMode?: 'async' | 'sync'
}) {
  // Extract and remove top-level title if present to avoid duplication into first frame
  const topTitle = extractTitle(params.rawScript)
  const scriptWithoutTitle = topTitle ? stripTitle(params.rawScript) : params.rawScript
  let scenes: ParsedScene[] = parseScript(scriptWithoutTitle)
  // If any scene is missing required metadata (shotDescription, shotType, dialogue, sound),
  // attempt to enrich it using the LLM so cards always have those fields.
  if (process.env.OPENROUTER_API_KEY) {
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i]
      const missing = !(s.shotDescription && s.shotDescription.trim()) || !s.shotType || !s.dialogue || !s.sound
      if (missing) {
        try {
          const enriched = await extractMetadataWithLLM(s.raw || s.shotDescription || '', params.style, params.aspectRatio)
          scenes[i] = { ...s, ...enriched }
        } catch (err) {
          // If enrichment fails, keep original parsed scene (graceful fallback)
          console.error('metadata enrichment failed for scene', i, err)
        }
      }
    }
  }
  const storyboardId = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  // Debug: log parsed scenes to help diagnose scene numbering issues
  try {
    console.log('[createStoryboard] parsed scenes:', scenes.map((s, idx) => ({ idx, order: s.order, firstLine: (s.raw || '').split('\n')[0].slice(0, 140) })))
    if (scenes.length <= 1) {
      console.warn('[createStoryboard] parsed only', scenes.length, 'scene(s). Raw script sample:', (params.rawScript || '').slice(0, 600))
    }
  } catch (e) {
    console.error('[createStoryboard] failed to log scenes', e)
  }
  const frames: FrameRecord[] = scenes.map((s, i) => {
    const parsed = s as ParsedScene
    const sceneOrder = parsed.sceneNumber !== undefined ? parsed.sceneNumber - 1 : i
    return {
      id: `f_${storyboardId}_${i}`,
      storyboardId,
      sceneOrder,
      order: i,
      baseDescription: s.shotDescription,
      title: deriveTitle(s),
      shotType: s.shotType,
      dialogue: s.dialogue,
      sound: s.sound,
      status: 'pending'
    }
  })
  // Ensure frames are ordered by their scene number so generation and UI present Scene 1..N
  frames.sort((a, b) => (a.sceneOrder ?? 0) - (b.sceneOrder ?? 0))
  const record: StoryboardRecord = {
    id: storyboardId,
    projectId: params.projectId,
    script: params.rawScript,
    aspectRatio: params.aspectRatio,
    style: params.style,
    createdAt: Date.now(),
    status: 'pending',
  frames,
  title: topTitle || frames[0]?.title || 'Storyboard'
  }
  storyboards.set(storyboardId, record)
  // Prepare emitter so SSE clients can attach immediately
  ensureEmitter(storyboardId)
  const mode = params.processMode || 'async'
  if (mode === 'sync') {
    await enhanceStoryboardAsync(record)
  } else {
    enhanceStoryboardAsync(record).catch((err) => {
      console.error('enhance storyboard failed', err)
      record.status = 'partial'
    })
  }
  return record
}

async function extractMetadataWithLLM(block: string, style: string, aspect: string) {
  // Returns an object with keys: shotDescription, shotType, dialogue, sound
  const prompt = `Extract the following fields from the scene text. Output ONLY a valid JSON object with keys: shotDescription, shotType, dialogue, sound. If a field is missing, set it to an empty string. Do not include any extra text.\n\nScene text:\n${block}`
  try {
    const res = await retry(async () => {
      const r = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You extract structured metadata from screenplay scene blocks.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0
      })
      const text = r.choices?.[0]?.message?.content?.toString().trim()
      if (!text) throw new Error('Empty LLM response')
      return text
    }, { retries: 2, baseDelay: 250 })

    // Try to parse JSON from the returned text. If the model outputs code fences, strip them.
    const cleaned = res.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      shotDescription: (parsed.shotDescription || '').toString(),
      shotType: (parsed.shotType || '').toString(),
      dialogue: (parsed.dialogue || '').toString(),
      sound: (parsed.sound || '').toString()
    }
  } catch (e) {
    throw e
  }
}

async function enhanceStoryboardAsync(sb: StoryboardRecord) {
  sb.status = 'processing'
  for (const frame of sb.frames) {
    await regenerateFrameInternal(sb, frame.id)
  }
  const anyError = sb.frames.some(f => f.status === 'error')
  sb.status = anyError ? 'partial' : 'ready'
  // final broadcast
  const emitter = ensureEmitter(sb.id)
  emitter.emit('complete', { storyboardId: sb.id, status: sb.status, frames: sb.frames.map(trimFrame) })
}

export async function regenerateFrame(storyboardId: string, frameId: string) {
  const sb = storyboards.get(storyboardId)
  if (!sb) throw new Error('Storyboard not found')
  await regenerateFrameInternal(sb, frameId, true)
  return sb.frames.find(f=>f.id===frameId)
}

async function regenerateFrameInternal(sb: StoryboardRecord, frameId: string, bumpStatus = false) {
  const frame = sb.frames.find(f=>f.id===frameId)
  if (!frame) throw new Error('Frame not found')
  const emitter = ensureEmitter(sb.id)
  const broadcast = () => emitter.emit('update', { storyboardId: sb.id, status: sb.status, frame: trimFrame(frame) })
  try {
    frame.status = 'enhancing'
    frame.error = undefined
    frame.enhancedDescription = await enhanceWithLLM(frame.baseDescription, sb.style)
    broadcast()
    frame.status = 'prompted'
    frame.imagePrompt = buildImagePrompt(frame, sb)
    broadcast()
    frame.status = 'generating'
    broadcast()
  // Real image generation via FAL (flux/schnell). Fallback to placeholder if no key.
    try {
      frame.imageUrl = await generateImage(frame.imagePrompt || frame.enhancedDescription || frame.baseDescription || '')
      frame.status = 'ready'
    } catch (imgErr: any) {
      console.error('image generation failed', imgErr)
      frame.error = imgErr?.message || 'Image generation failed'
      // Provide graceful fallback placeholder so UI still shows something
      frame.imageUrl = frame.imageUrl || `https://placehold.co/1024x576?text=${encodeURIComponent('image error')}`
      frame.status = 'error'
    }
    broadcast()
    if (bumpStatus) {
      const ready = sb.frames.every(f=>['ready','error'].includes(f.status))
      if (ready) sb.status = sb.frames.some(f=>f.status==='error') ? 'partial' : 'ready'
    }
  } catch (e: unknown) {
    frame.status = 'error'
    frame.error = e instanceof Error ? e.message : 'Failed'
    broadcast()
  }
}

async function enhanceWithLLM(base: string, style: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    return enhanceText(base, style) // fallback
  }
  const prompt = `Enhance this storyboard frame description into a vivid, concise cinematic description (max 60 words) retaining core meaning. Style hint: ${style}. Input: "${base}"`.
    replace(/\s+/g,' ').trim()
  try {
    const completion = await retry(async ()=> {
      const res = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You refine storyboard frame descriptions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
      const text = res.choices?.[0]?.message?.content?.toString().trim()
      if (!text) throw new Error('Empty response')
      return text
    }, { retries: 2, baseDelay: 250 })
    return completion
  } catch (e:any) {
    return enhanceText(base, style)
  }
}

function enhanceText(base: string, style: string) {
  return base.length < 20
    ? `${base} – detailed ${style} cinematic focus`
    : `${base} – refined ${style} mood lighting`
}

function buildImagePrompt(frame: FrameRecord, sb: StoryboardRecord) {
  const parts = [frame.enhancedDescription || frame.baseDescription]
  if (frame.shotType) parts.push(frame.shotType)
  parts.push(sb.style, `aspect ${sb.aspectRatio}`)
  return parts.join(', ')
}

async function generateImage(prompt: string): Promise<string> {
  if (!process.env.FAL_KEY) {
    return `https://placehold.co/1280x720?text=${encodeURIComponent('no+fal+key')}`
  }
  fal.config({ credentials: process.env.FAL_KEY })
  const safePrompt = (prompt || '').trim() || 'cinematic frame'
  const url = await retry(async () => {
    const t0 = Date.now()
    const submission: any = await fal.subscribe('fal-ai/flux/schnell', {
      input: { prompt: safePrompt },
      onQueueUpdate(update) {
        if (update?.status === 'IN_QUEUE' || update?.status === 'IN_PROGRESS') {
          console.log('[FAL][queue]', update.status, (update as any).position ?? '-')
        }
      }
    })
    const elapsed = Date.now() - t0
    let found: string | undefined = submission?.images?.[0]?.url
      || submission?.output?.[0]?.url
      || submission?.image?.url
      || submission?.data?.[0]?.url
      || submission?.result?.[0]?.url
      || submission?.artifacts?.[0]?.url
    // Deep scan for any nested url
    if (!found && submission && typeof submission === 'object') {
      try {
        const stack: any[] = [submission]
        const seen = new Set<any>()
        while (stack.length) {
          const cur = stack.pop()
          if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
          seen.add(cur)
          if (Array.isArray(cur)) { for (const it of cur) stack.push(it); continue }
          if (!found && typeof cur.url === 'string' && /^https?:\/\//.test(cur.url)) { found = cur.url; break }
          for (const k of Object.keys(cur)) stack.push(cur[k])
        }
      } catch (scanErr) {
        console.warn('[FAL][scan-error]', scanErr)
      }
    }
    // Base64 variants
    if (!found) {
      const b64 = submission?.output?.[0]?.b64 || submission?.output?.[0]?.base64 || submission?.image?.b64
        || submission?.images?.[0]?.b64 || submission?.images?.[0]?.base64
      if (typeof b64 === 'string' && b64.length > 50) {
        found = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
      }
    }
    if (!found) {
      console.error('[FAL][empty-image]', { keys: Object.keys(submission || {}), elapsedMs: elapsed, sample: JSON.stringify(submission || {}).slice(0, 900) })
      throw new Error('Empty image response')
    }
    console.log('[FAL][image-ready]', { elapsedMs: elapsed, url: found })
    return found
  }, { retries: 0, baseDelay: 500 })
  return url
}

export function trimFrame(f: FrameRecord) {
  return {
    id: f.id,
    imageUrl: f.imageUrl,
    scene: (f.sceneOrder ?? 0) + 1,
    shotDescription: f.baseDescription || '',
    title: f.title || '',
    shot: f.shotType || '',
    dialogue: f.dialogue || '',
    sound: f.sound || '',
    imagePrompt: f.imagePrompt || '',
    status: f.status
  }
}

function deriveTitle(scene: ParsedScene): string {
  const raw = (scene.shotDescription || scene.raw || '').trim()
  if (!raw) return 'Untitled'
  const first = raw.split(/\n/)[0].trim()
  const slice = first.length > 80 ? first.slice(0, 77) + '…' : first
  return slice || 'Untitled'
}

export function trimFrames(frames: FrameRecord[]) {
  return frames.map(trimFrame)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function retry<T>(fn: ()=>Promise<T>, opts: { retries: number; baseDelay: number }): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempt = 0
    const run = () => {
      fn().then(resolve).catch(err => {
        if (attempt >= opts.retries) return reject(err)
        attempt++
        setTimeout(run, opts.baseDelay * Math.pow(2, attempt))
      })
    }
    run()
  })
}
