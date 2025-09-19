import { NextResponse } from 'next/server'
import { createStoryboard, trimFrames } from '@/lib/storyboardEngine'
import { extractTitle, stripTitle } from '@/lib/scriptParser'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import type { ScriptModel } from '@/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const projectId = body.projectId
    const modelId = body.modelId // 새로운 방식
    const script = body.script || '' // 기존 방식 (하위 호환성)
    const style = body.visualStyle
    const ratio = body.ratio
    const mode = body.mode === 'async' ? 'async' : 'sync'
    const aiModel = body.aiModel
    
    let scriptContent: string
    let scriptTitle: string | undefined
    
    // modelId가 제공된 경우 (새로운 방식)
    if (modelId) {
      // Supabase 클라이언트 초기화
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // script_models 테이블에서 모델 데이터 조회
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
      aiModel
    })
    // Persist storyboard metadata to Supabase
    try {
      // Try to resolve an owner user_id from the project (if provided)
      let ownerId: string | undefined = undefined
      if (projectId) {
        const { data: projectData, error: projErr } = await supabase.from('projects').select('user_id').eq('id', projectId).single()
        if (!projErr && projectData && (projectData as { user_id?: string }).user_id) ownerId = (projectData as { user_id: string }).user_id
      }
      ownerId = ownerId || process.env.SYSTEM_USER_ID || 'unknown'
      
      // Save basic storyboard row with model reference if available
      const storyboardData: any = {
        id: sb.id,
        user_id: ownerId,
        project_id: projectId,
        title: sb.title || '',
        description: JSON.stringify({ 
          script: scriptWithoutTitle, 
          frames: trimFrames(sb.frames), 
          aspect: aspect, 
          style: chosenStyle, 
          aiModel: aiModel,
          createdAt: Date.now() 
        }),
        is_public: false
      }
      
      // 모델 ID가 있는 경우 참조 추가
      if (modelId) {
        storyboardData.script_model_id = modelId
      }
      
      const { error: insertErr } = await supabase.from('storyboards').insert([storyboardData])
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
