import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToR2, deleteImageFromR2 } from '../../../lib/r2'
import { supabase } from '../../../lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storyboardId = formData.get('storyboardId') as string
    const frameId = formData.get('frameId') as string

    if (!file || !storyboardId || !frameId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert file to data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // If this is an "empty" / unsaved storyboard (local working area),
    // do NOT persist the uploaded image to R2. Return the data URL so the
    // frontend can use the image without creating a permanent object.
    if (!storyboardId || storyboardId === 'default' || storyboardId === 'empty') {
      return NextResponse.json({
        success: true,
        publicUrl: dataUrl,
        signedUrl: null,
        key: '',
        size: file.size,
        type: 'uploaded'
      })
    }

    // 기존 이미지가 있다면 삭제
    try {
      const { data: existingCard } = await supabase
        .from('cards')
        .select('image_key')
        .eq('id', frameId)
        .single()
      
      if (existingCard?.image_key) {
        await deleteImageFromR2(existingCard.image_key)
      }
    } catch (error) {
      // 기존 이미지 삭제 실패는 무시하고 계속 진행
      console.warn('Failed to delete existing image:', error)
    }

    const result = await uploadImageToR2(storyboardId, frameId, dataUrl)

    console.log('[Upload] R2 result:', {
      publicUrl: result.publicUrl,
      signedUrl: result.signedUrl,
      key: result.key,
      bucket: process.env.R2_BUCKET_NAME,
      baseUrl: process.env.R2_PUBLIC_BASE_URL
    })

    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl || result.signedUrl,
      signedUrl: result.signedUrl || null,
      key: result.key,
      size: file.size,
      type: 'uploaded'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
