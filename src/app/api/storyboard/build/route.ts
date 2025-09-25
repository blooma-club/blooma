import { NextResponse } from 'next/server'
import { createStoryboard, trimFrames } from '@/lib/storyboardEngine'
import { extractTitle, stripTitle } from '@/lib/scriptParser'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import type { ScriptModel } from '@/types'

export async function POST(req: Request) {
  try {
    // First, authenticate the user like other API routes
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user: authenticatedUser }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !authenticatedUser) {
      console.error('[STORYBOARD BUILD] Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('[STORYBOARD BUILD] Authenticated user:', { id: authenticatedUser.id, email: authenticatedUser.email })
    
    const body = await req.json()
    const projectId = body.projectId
    const modelId = body.modelId // 새로운 방식
    const script = body.script || '' // 기존 방식 (하위 호환성)
    const style = body.visualStyle
    const ratio = body.ratio
    const mode = body.mode === 'async' ? 'async' : 'sync'
    const aiModel = body.aiModel
    const characters = body.characters || [] // Character references
    
    let scriptContent: string
    let scriptTitle: string | undefined
    
    // modelId가 제공된 경우 (새로운 방식)
    if (modelId) {
      // script_models 테이블에서 모델 데이터 조회 (authenticated client 사용)
      const { data: modelData, error: modelError } = await supabaseClient
        .from('script_models')
        .select('*')
        .eq('id', modelId)
        .eq('project_id', projectId)
        .single()
      
      if (modelError || !modelData) {
        return NextResponse.json({ error: 'Model not found or access denied' }, { status: 404 })
      }
      
      const scriptModel: ScriptModel = modelData
      scriptContent = scriptModel.script_content
      scriptTitle = scriptModel.script_title
      
      // 모델 데이터를 사용하여 스토리보드 생성 시 추가 정보 활용 가능
      // 현재는 스크립트 내용만 사용하지만 향후 확장 가능
    } else if (script.trim()) {
      // 기존 방식 (script 직접 제공)
      scriptContent = script
      scriptTitle = undefined
    } else {
      return NextResponse.json({ error: 'Missing script or modelId' }, { status: 400 })
    }
    
    const aspect = ratio || '16:9'
    const chosenStyle = style || 'Photorealistic'
    
    // Extract and strip a top-level Title so we don't persist it twice
    const topTitle = scriptTitle || extractTitle(scriptContent)
    const scriptWithoutTitle = topTitle ? stripTitle(scriptContent) : scriptContent
    
    const sb = await createStoryboard({ 
      projectId, 
      rawScript: scriptWithoutTitle, 
      aspectRatio: aspect, 
      style: chosenStyle, 
      processMode: mode, 
      topTitle,
      aiModel,
      characters
    })
    // Since we're not using the storyboards table anymore, we skip storyboard metadata persistence
    // and only create the cards directly
    console.log('[STORYBOARD BUILD] Skipping storyboard table - creating cards directly')
    
    // Use the authenticated user's ID directly
    const ownerId = authenticatedUser.id
    
    console.log('[STORYBOARD BUILD] Using authenticated user as owner:', ownerId)
    
    // Optionally verify the user has access to the project (if projectId is provided)
    if (projectId) {
      const { data: projectData, error: projErr } = await supabaseClient
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .eq('user_id', authenticatedUser.id)
        .single()
      
      if (projErr || !projectData) {
        console.error('[STORYBOARD BUILD] User does not have access to project:', projectId)
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 403 }
        )
      }
      
      console.log('[STORYBOARD BUILD] Project access verified for user:', authenticatedUser.id)
    }

    // Also create initial cards for the Editor from generated frames (so Editor can open immediately)
    try {
      const frames = trimFrames(sb.frames)
      if (frames && Array.isArray(frames) && frames.length > 0) {
        console.log('[CARDS] Creating initial cards for frames:', frames.length)
        console.log('[CARDS] Using projectId:', projectId, 'userId:', ownerId)
        
        const cardsToInsert = frames.map((f, idx) => {
          const cardData = {
            project_id: projectId,
            user_id: ownerId as string,
            type: 'scene' as const,
            title: `Scene ${f.scene}`,
            content: f.shotDescription || '',
            user_input: f.imagePrompt || '', // This is the user input for generating content
            
            // Storyboard metadata fields - THESE WERE MISSING!
            scene_number: f.scene,
            shot_type: f.shot || '', // This was missing!
            shot_description: f.shotDescription || '',
            dialogue: f.dialogue || '',
            sound: f.sound || '',
            image_prompt: f.imagePrompt || '',
            storyboard_status: 'pending',
            
            // Image fields (initially empty, will be populated during async generation)
            image_url: null,
            image_urls: [],
            selected_image_url: 0,
            image_key: null,
            image_size: null,
            image_type: null,
            
            order_index: idx
          }
          
          console.log(`[CARDS] Creating card ${idx + 1}:`, {
            scene: cardData.scene_number,
            shot_type: cardData.shot_type,
            user_input: cardData.user_input?.slice(0, 50) + '...',
            image_prompt: cardData.image_prompt?.slice(0, 50) + '...'
          })
          
          return cardData
        })

        const { data: insertedCards, error: cardsErr } = await supabaseClient
          .from('cards')
          .insert(cardsToInsert)
          .select()

        if (cardsErr) {
          console.error('[CARDS] Failed to insert cards:', cardsErr)
          console.warn('[persist cards] insert error', cardsErr.message)
          throw new Error(`Failed to create cards: ${cardsErr.message}`)
        } else {
          console.log('[CARDS] Successfully created', insertedCards?.length || 0, 'cards')
          console.log('[CARDS] Sample inserted card:', insertedCards?.[0] ? {
            id: insertedCards[0].id,
            project_id: insertedCards[0].project_id,
            user_id: insertedCards[0].user_id,
            title: insertedCards[0].title
          } : 'No cards')
        }
      }
    } catch (cardsPersistErr) {
      console.error('[CARDS] Failed to persist initial cards to Supabase:', cardsPersistErr)
      console.warn('Failed to persist initial cards to Supabase', cardsPersistErr)
      throw cardsPersistErr // Re-throw the error so the API returns failure
    }

  // For sync mode, return full frames. For async mode return initial shell frames (no waiting for generation)
  return NextResponse.json({ projectId: projectId, storyboardId: sb.id, mode, framesCount: sb.frames.length, title: sb.title || '', frames: trimFrames(sb.frames) })
  } catch (err: any) {
    console.error('build storyboard error', err)
    return NextResponse.json({ error: 'Build failed' }, { status: 500 })
  }
}
