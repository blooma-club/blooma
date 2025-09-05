import { NextResponse } from 'next/server'
import { createStoryboard, trimFrames } from '@/lib/storyboardEngine'
import { extractTitle, stripTitle } from '@/lib/scriptParser'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const projectId = body.projectId
    const script = body.script || ''
    const style = body.visualStyle
    const ratio = body.ratio
    const mode = body.mode === 'async' ? 'async' : 'sync'
    // AI Model settings
    const aiModel = body.aiModel
    
    if (!script.trim()) return NextResponse.json({ error: 'Missing script' }, { status: 400 })
    const aspect = ratio || '16:9'
    const chosenStyle = style || 'Photorealistic'
    // Extract and strip a top-level Title so we don't persist it twice (as sb.title and inside script)
    const topTitle = extractTitle(script)
    const scriptWithoutTitle = topTitle ? stripTitle(script) : script
    const sb = await createStoryboard({ 
      projectId, 
      rawScript: scriptWithoutTitle, 
      aspectRatio: aspect, 
      style: chosenStyle, 
      processMode: mode, 
      topTitle,
      // AI Model settings
      aiModel
    })
  // Persist storyboard metadata to Supabase so it can be opened later from /storyboard/[sbid]
  try {
    // Try to resolve an owner user_id from the project (if provided)
    let ownerId: string | undefined = undefined
    if (projectId) {
      const { data: projectData, error: projErr } = await supabase.from('projects').select('user_id').eq('id', projectId).single()
      if (!projErr && projectData && (projectData as { user_id?: string }).user_id) ownerId = (projectData as { user_id: string }).user_id
    }
    ownerId = ownerId || process.env.SYSTEM_USER_ID || 'unknown'
    // Save basic storyboard row. We stringify frames into description to avoid schema changes.
    const { error: insertErr } = await supabase.from('storyboards').insert([{
      id: sb.id,
      user_id: ownerId,
      project_id: projectId,
      title: sb.title || '',
      // Store original script plus initial trimmed frames (no large baseDescription duplication)
  // Persist script without a top-level title (title lives in sb.title). Keep frames trimmed.
  description: JSON.stringify({ 
    script: scriptWithoutTitle, 
    frames: trimFrames(sb.frames), 
    aspect: aspect, 
    style: chosenStyle, 
    aiModel: aiModel,
    createdAt: Date.now() 
  }),
      is_public: false
    }])
    if (insertErr) console.warn('[persist storyboard] insert error', insertErr.message)

    // Also create initial cards for the Editor from generated frames (so Editor can open immediately)
    try {
      const frames = trimFrames(sb.frames)
      if (frames && Array.isArray(frames) && frames.length > 0) {
        const cardsToInsert = frames.map((f, idx) => ({
          storyboard_id: sb.id,
          user_id: ownerId as string,
          type: 'scene',
          title: `Scene ${f.scene}`,
          content: f.shotDescription || '',
          user_input: f.imagePrompt || '',
          image_prompt: f.imagePrompt || '',
          image_urls: [],
          selected_image_url: 0,
          storyboard_status: 'pending',
          order_index: idx
        }))

        const { error: cardsErr } = await supabase.from('cards').insert(cardsToInsert)
        if (cardsErr) {
          console.warn('[persist cards] insert error', cardsErr.message)
        }
      }
    } catch (cardsPersistErr) {
      console.warn('Failed to persist initial cards to Supabase', cardsPersistErr)
    }
  } catch (persistErr) {
    console.error('Failed to persist storyboard to Supabase', persistErr)
  }

  // For sync mode, return full frames. For async mode return initial shell frames (no waiting for generation)
  return NextResponse.json({ storyboardId: sb.id, mode, framesCount: sb.frames.length, title: sb.title || '', frames: trimFrames(sb.frames) })
  } catch (err: any) {
    console.error('build storyboard error', err)
    return NextResponse.json({ error: 'Build failed' }, { status: 500 })
  }
}
