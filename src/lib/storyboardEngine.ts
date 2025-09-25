import { parseScript, ParsedScene, extractTitle, stripTitle } from './scriptParser'
import { openrouter } from './openrouter'
import { EventEmitter } from 'events'
import { generateImageWithModel, DEFAULT_MODEL } from './fal-ai'
import { uploadImageToR2 } from './r2'
import { supabase } from './supabase'

export interface FrameRecord {
  id: string
  storyboardId: string
  sceneOrder: number
  order: number
  baseDescription: string
  shotType?: string
  dialogue?: string
  sound?: string
  enhancedDescription?: string
  imagePrompt?: string
  imageUrl?: string
  characterImageUrls?: string[] // Reference images for characters mentioned in this frame
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
  // AI Model settings
  aiModel?: string
  aiQuality?: 'fast' | 'balanced' | 'high'
  // Character references for image generation
  characters?: Array<{
    id: string
    name: string
    imageUrl?: string
    originalImageUrl?: string
    editPrompt?: string
  }>
}

const storyboards = new Map<string, StoryboardRecord>()
const storyboardEmitters = new Map<string, EventEmitter>()
const emitterTimeouts = new Map<string, NodeJS.Timeout>()

function ensureEmitter(id: string) {
  let em = storyboardEmitters.get(id)
  if (!em) { 
    em = new EventEmitter()
    em.setMaxListeners(50) // 더 많은 리스너 허용
    storyboardEmitters.set(id, em)
    
    // 1시간 후 자동 정리
    const timeout = setTimeout(() => {
      console.log(`[Engine] Auto-cleaning emitter for storyboard: ${id}`)
      cleanupEmitter(id)
    }, 60 * 60 * 1000) // 1시간
    
    emitterTimeouts.set(id, timeout)
  }
  return em
}

function cleanupEmitter(id: string) {
  const em = storyboardEmitters.get(id)
  if (em) {
    em.removeAllListeners()
    storyboardEmitters.delete(id)
  }
  
  const timeout = emitterTimeouts.get(id)
  if (timeout) {
    clearTimeout(timeout)
    emitterTimeouts.delete(id)
  }
  
  console.log(`[Engine] Cleaned up emitter for storyboard: ${id}`)
}

export function getStoryboardEmitter(id: string) {
  return ensureEmitter(id)
}

export function removeStoryboardEmitter(id: string) {
  cleanupEmitter(id)
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
  topTitle?: string
  // AI Model settings
  aiModel?: string
  // Character references for image generation
  characters?: Array<{
    id: string
    name: string
    imageUrl?: string
    originalImageUrl?: string
    editPrompt?: string
  }>
}) {
  // Allow callers to provide a top-level title (extracted earlier). If not provided,
  // attempt to extract it here. If a top title exists we strip it from the script
  // before parsing so it doesn't appear as a first frame description.
  const providedTop = params.topTitle
  const detectedTop = providedTop ?? extractTitle(params.rawScript)
  const scriptWithoutTitle = providedTop ? params.rawScript : (detectedTop ? stripTitle(params.rawScript) : params.rawScript)
  const scenes: ParsedScene[] = parseScript(scriptWithoutTitle)
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
  // In the new architecture, use project ID as storyboard ID
  const storyboardId = params.projectId || crypto.randomUUID()
  // Debug: log parsed scenes to help diagnose scene numbering issues
  try {
    console.log('[createStoryboard] parsed scenes:', scenes.map((s, idx) => ({ idx, order: s.order, firstLine: (s.raw || '').split('\n')[0].slice(0, 140) })))
    if (scenes.length <= 1) {
      console.warn('[createStoryboard] parsed only', scenes.length, 'scene(s). Raw script sample:', (params.rawScript || '').slice(0, 600))
    }
  } catch (e) {
    console.error('[createStoryboard] failed to log scenes', e)
  }
  // 1) 임시 프레임 생성 (sceneNumber가 없거나 중복/불연속인 경우를 안전하게 처리)
  const provisionalFrames: FrameRecord[] = scenes.map((s, i) => {
    const parsed = s as ParsedScene
    // sceneNumber가 유효한 양수라면 그대로 사용(0-based로 변환), 아니면 i 사용
    const initialSceneOrder = (typeof parsed.sceneNumber === 'number' && parsed.sceneNumber > 0)
      ? parsed.sceneNumber - 1
      : i
    return {
      id: crypto.randomUUID(),
      storyboardId,
      sceneOrder: initialSceneOrder,
      order: i,
      baseDescription: s.shotDescription,
      shotType: s.shotType,
      dialogue: s.dialogue,
      sound: s.sound,
      status: 'pending'
    }
  })

  // 2) sceneOrder 기준 정렬 후, 0..N-1로 재번호를 강제하여 Scene 1..N이 연속되도록 보정
  provisionalFrames.sort((a, b) => (a.sceneOrder ?? 0) - (b.sceneOrder ?? 0))
  for (let i = 0; i < provisionalFrames.length; i++) {
    provisionalFrames[i].sceneOrder = i
  }

  const frames: FrameRecord[] = provisionalFrames

  // Create storyboard record
  const record: StoryboardRecord = {
    id: storyboardId,
    projectId: params.projectId,
    script: params.rawScript,
    aspectRatio: params.aspectRatio,
    style: params.style,
    createdAt: Date.now(),
    status: 'pending',
    frames,
    title: detectedTop || 'Storyboard',
    // AI Model settings
    aiModel: params.aiModel,
    aiQuality: 'balanced', // Default to balanced for image generation
    // Character references for image generation
    characters: params.characters || []
  }

  // Generate image prompts for each frame
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    try {
      // Build basic image prompt
      const basicPrompt = buildImagePrompt(frame, record)
      
      // Enhance with LLM if available
      if (process.env.OPENROUTER_API_KEY) {
        const enhancedPrompt = await enhanceWithLLM(basicPrompt, params.style)
        frame.imagePrompt = enhancedPrompt
        frame.enhancedDescription = enhancedPrompt
      } else {
        // Fallback to basic prompt
        frame.imagePrompt = basicPrompt
        frame.enhancedDescription = basicPrompt
      }
    } catch (error) {
      console.error(`Failed to generate image prompt for frame ${i}:`, error)
      // Fallback to basic prompt on error
      const basicPrompt = buildImagePrompt(frame, record)
      frame.imagePrompt = basicPrompt
      frame.enhancedDescription = basicPrompt
    }
  }
  storyboards.set(storyboardId, record)
  // Prepare emitter so SSE clients can attach immediately
  const emitter = ensureEmitter(storyboardId)
  
  // Start image generation process if in async mode
  if (params.processMode === 'async') {
    // Start image generation in background
    processFramesAsync(storyboardId, record, emitter)
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






async function enhanceWithLLM(base: string, style: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    return enhanceText(base, style) // fallback
  }
  const prompt = `Enhance this storyboard frame description into a vivid, concise cinematic description (max 100 words) retaining core meaning. Style hint: ${style}. Input: "${base}"`.
    replace(/\s+/g,' ').trim()
  try {
    const completion = await retry(async ()=> {
      const res = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: `You are an expert prompt engineer creating high-impact, visually striking prompts for image generation. Transform user concepts into structured prompts that maximize visual quality, dynamism, and narrative depth.

**Structure:** [Technical framework]: [Main subject & action], [environmental storytelling], [special elements]. Technical specifications.

Technical framework indicates either a specific camera + lens (e.g., Sony A1, Canon R5, iPhone 14 pro) OR an art/style reference (e.g., Studio Ghibli, Film noir aesthetic).

Component Guidelines:
- Square brackets should be used for dynamic focal points only.
  - [Main subject & action]: Primary subject with active, vivid verbs.
  - [Environmental storytelling]: Critical atmosphere, weather, lighting interactions.
  - [Special elements]: Unique compositional highlights or dramatic effects.
- Technical Specifications: Include 2-3 quality enhancers (perspective + lighting + resolution/style terms).

Quality Keywords (use where appropriate): ultra-detail, HDR, volumetric lighting, cinematic composition, shallow depth of field, 8K resolution

Output: Deliver the complete structured prompt only, following the exact format above.` },
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
  const baseDescription = frame.enhancedDescription || frame.baseDescription
  const parts = [baseDescription]
  
  // Add character references if characters are mentioned in the shot description
  if (sb.characters && sb.characters.length > 0) {
    const characterRefs = []
    const characterImageUrls = []
    
    for (const character of sb.characters) {
      // Check if character is mentioned in the description (case-insensitive)
      const characterName = character.name.toLowerCase()
      const description = baseDescription.toLowerCase()
      
      if (description.includes(characterName)) {
        // Build character reference description
        let characterRef = `${character.name}`
        
        // Add visual description if available
        if (character.editPrompt && character.editPrompt.trim()) {
          characterRef += ` (${character.editPrompt.trim()})`
        }
        
        characterRefs.push(characterRef)
        
        // Collect character image URLs for visual reference
        if (character.imageUrl) {
          characterImageUrls.push(character.imageUrl)
        } else if (character.originalImageUrl) {
          characterImageUrls.push(character.originalImageUrl)
        }
      }
    }
    
    // Store character image URLs in the frame for later use during image generation
    frame.characterImageUrls = characterImageUrls
    
    // Add character references to the prompt
    if (characterRefs.length > 0) {
      parts.push(`featuring: ${characterRefs.join(', ')}`)
    }
  }
  
  if (frame.shotType) parts.push(frame.shotType)
  parts.push(sb.style, `aspect ${sb.aspectRatio}`)
  return parts.join(', ')
}



export function trimFrame(f: FrameRecord) {
  return {
    id: f.id,
    imageUrl: f.imageUrl,
    scene: (f.sceneOrder ?? 0) + 1,
    shotDescription: f.baseDescription || '',
    shot: f.shotType || '',
    dialogue: f.dialogue || '',
    sound: f.sound || '',
    imagePrompt: f.imagePrompt || '',
    status: f.status
  }
}

// deriveTitle removed: per-frame titles no longer used; global storyboard title only.

export function trimFrames(frames: FrameRecord[]) {
  return frames.map(trimFrame)
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

async function processFramesAsync(storyboardId: string, record: StoryboardRecord, emitter: EventEmitter) {
  console.log(`[Engine] Starting async image generation for storyboard: ${storyboardId}`)
  
  const sb = storyboards.get(storyboardId)
  if (!sb) {
    console.error(`[Engine] Storyboard not found: ${storyboardId}`)
    return
  }
  
  // Update status to processing
  sb.status = 'processing'
  emitter.emit('update', { storyboardId, status: 'processing' })
  
  try {
    // Process frames sequentially
    for (let i = 0; i < sb.frames.length; i++) {
      const frame = sb.frames[i]
      
      // Update frame status to generating
      frame.status = 'generating'
      emitter.emit('update', { 
        storyboardId, 
        frame: trimFrame(frame),
        status: 'generating'
      })
      
      try {
        // Generate image using the frame's imagePrompt
        if (frame.imagePrompt) {
          const result = await generateImageWithModel(
            frame.imagePrompt, 
            record.aiModel || DEFAULT_MODEL,
            {
              aspectRatio: record.aspectRatio,
              style: record.style,
              // Pass character reference images if available
              imageUrls: frame.characterImageUrls && frame.characterImageUrls.length > 0 
                ? frame.characterImageUrls 
                : undefined
            }
          )
          
          // Update frame with generated image
          if (result.success && result.imageUrl) {
            // 1) R2 업로드
            let publicUrl: string | null = null
            let key: string | null = null
            let size: number | null = null
            try {
              const uploaded = await uploadImageToR2(storyboardId, frame.id, result.imageUrl)
              publicUrl = uploaded.publicUrl || uploaded.signedUrl || null
              key = uploaded.key
              size = uploaded.size || null
            } catch (uploadErr) {
              console.error(`[Engine] R2 upload failed for frame ${i}:`, uploadErr)
            }

            // 2) 메모리 프레임 업데이트 (publicUrl 우선)
            frame.imageUrl = publicUrl || result.imageUrl

            // 3) DB 업데이트
            try {
              const updateData = {
                image_url: frame.imageUrl,
                image_urls: [frame.imageUrl],
                selected_image_url: 0,
                image_key: key || undefined,
                image_size: size || undefined,
                image_type: 'generated',
                storyboard_status: 'ready'
              }
              
              console.log(`[Engine] Updating card ${i} with R2 data:`, {
                storyboardId,
                order_index: i,
                image_url: frame.imageUrl?.slice(0, 50) + '...',
                image_key: key,
                image_size: size
              })
              
              const { error: updateError } = await supabase
                .from('cards')
                .update(updateData)
                .eq('project_id', storyboardId)
                .eq('order_index', i)
              
              if (updateError) {
                console.error(`[Engine] Failed to update card in database for frame ${i}:`, updateError)
              } else {
                console.log(`[Engine] Successfully updated card in database for frame ${i}: ${storyboardId}`)
              }
            } catch (dbError) {
              console.error(`[Engine] Database update error for frame ${i}:`, dbError)
            }
          } else {
            throw new Error(result.error || 'Image generation failed')
          }
          frame.status = 'ready'
          
          // Emit frame update
          emitter.emit('update', { 
            storyboardId, 
            frame: trimFrame(frame),
            status: 'ready'
          })
          
          console.log(`[Engine] Generated image for frame ${i + 1}/${sb.frames.length}: ${storyboardId}`)
        } else {
          frame.status = 'error'
          frame.error = 'No image prompt available'
          emitter.emit('update', { 
            storyboardId, 
            frame: trimFrame(frame),
            status: 'error'
          })
        }
      } catch (error) {
        console.error(`[Engine] Failed to generate image for frame ${i}:`, error)
        frame.status = 'error'
        frame.error = error instanceof Error ? error.message : 'Image generation failed'
        
        // DB에 에러 상태 업데이트
        try {
          const { error: updateError } = await supabase
            .from('cards')
            .update({ 
              storyboard_status: 'error'
            })
            .eq('project_id', storyboardId)
            .eq('order_index', i)
          
          if (updateError) {
            console.error(`[Engine] Failed to update error status in database for frame ${i}:`, updateError)
          }
        } catch (dbError) {
          console.error(`[Engine] Database error status update error for frame ${i}:`, dbError)
        }
        
        emitter.emit('update', { 
          storyboardId, 
          frame: trimFrame(frame),
          status: 'error'
        })
      }
      
      // Small delay between frames to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Update final status
    const readyFrames = sb.frames.filter(f => f.status === 'ready').length
    const errorFrames = sb.frames.filter(f => f.status === 'error').length
    
    if (readyFrames === sb.frames.length) {
      sb.status = 'ready'
    } else if (errorFrames > 0) {
      sb.status = 'partial'
    } else {
      sb.status = 'ready'
    }
    
    // Emit completion
    emitter.emit('complete', { 
      storyboardId, 
      status: sb.status,
      frames: sb.frames.map(trimFrame)
    })
    
    console.log(`[Engine] Completed image generation for storyboard: ${storyboardId}, status: ${sb.status}`)
    
  } catch (error) {
    console.error(`[Engine] Failed to process frames for storyboard: ${storyboardId}`, error)
    sb.status = 'error'
    emitter.emit('complete', { 
      storyboardId, 
      status: 'error',
      error: error instanceof Error ? error.message : 'Processing failed'
    })
  }
}
