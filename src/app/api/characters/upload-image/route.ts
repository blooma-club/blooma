import { NextRequest, NextResponse } from 'next/server'
import { uploadCharacterImageToR2 } from '@/lib/r2'
import { createClient } from '@supabase/supabase-js'

// Create admin client that bypasses RLS for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Need service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export const runtime = 'nodejs'

/**
 * Upload character image to Cloudflare R2
 * This endpoint handles both file uploads and saving generated images to R2
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let characterId: string
    let imageSource: string
    let projectId: string | undefined
    let characterName: string | undefined
    let editPrompt: string | undefined
    let userId: string | undefined
    let isUpdate: boolean = false

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      characterId = formData.get('characterId') as string
      projectId = formData.get('projectId') as string | undefined
      characterName = formData.get('characterName') as string | undefined
      editPrompt = formData.get('editPrompt') as string | undefined
      userId = formData.get('userId') as string | undefined
      isUpdate = formData.get('isUpdate') === 'true'

      if (!file || !characterId) {
        return NextResponse.json({ error: 'Missing file or characterId' }, { status: 400 })
      }

      // Handle empty strings as undefined
      if (projectId === '') projectId = undefined
      if (characterName === '') characterName = undefined
      if (editPrompt === '') editPrompt = undefined
      if (userId === '') userId = undefined

      // Convert file to data URL
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      imageSource = `data:${file.type};base64,${base64}`
    } else {
      // Handle JSON request (for saving generated images)
      const body = await request.json()
      characterId = body.characterId
      imageSource = body.imageUrl
      projectId = body.projectId
      characterName = body.characterName
      editPrompt = body.editPrompt
      userId = body.userId
      isUpdate = body.isUpdate || false

      if (!characterId || !imageSource) {
        return NextResponse.json({ error: 'Missing characterId or imageUrl' }, { status: 400 })
      }

      // Handle empty strings as undefined  
      if (projectId === '') projectId = undefined
      if (characterName === '') characterName = undefined
      if (editPrompt === '') editPrompt = undefined
      if (userId === '') userId = undefined
    }

    console.log(`[CharacterUpload] Uploading character image for ID: ${characterId}`)
    console.log(`[CharacterUpload] Request params:`, {
      characterId,
      projectId,
      characterName,
      userId,
      isUpdate,
      hasImageSource: !!imageSource
    })

    // Upload to R2
    const result = await uploadCharacterImageToR2(characterId, imageSource, projectId)

    console.log('[CharacterUpload] R2 result:', {
      publicUrl: result.publicUrl,
      signedUrl: result.signedUrl,
      key: result.key,
      size: result.size,
      bucket: process.env.R2_BUCKET_NAME,
      baseUrl: process.env.R2_PUBLIC_BASE_URL
    })

    // Save character to Supabase if we have the required data and user ID
    let characterData = null
    
    console.log(`[CharacterUpload] Supabase save conditions:`, {
      hasUserId: !!userId,
      hasCharacterName: !!characterName,
      isUpdate,
      shouldSave: !!(userId && characterName && !isUpdate)
    })
    
    if (userId && characterName && !isUpdate) {
      try {
        console.log('[CharacterUpload] Saving character to Supabase:', {
          name: characterName,
          project_id: projectId,
          user_id: userId
        })

        const { data, error } = await supabaseAdmin
          .from('characters')
          .insert({
            id: characterId,
            user_id: userId,
            project_id: projectId,
            name: characterName,
            edit_prompt: editPrompt,
            image_url: result.publicUrl || result.signedUrl,
            image_key: result.key,
            image_size: result.size,
          })
          .select()
          .single()

        if (error) {
          console.warn('[CharacterUpload] Failed to save character to Supabase:', error.message)
        } else {
          characterData = data
          console.log('[CharacterUpload] Successfully saved character to Supabase:', data.id)
        }
      } catch (supabaseError) {
        console.warn('[CharacterUpload] Supabase save error:', supabaseError)
      }
    } else if (isUpdate && userId) {
      // Update existing character with new image
      try {
        console.log('[CharacterUpload] Updating character image in Supabase:', characterId)

        const { data, error } = await supabaseAdmin
          .from('characters')
          .update({
            image_url: result.publicUrl || result.signedUrl,
            image_key: result.key,
            image_size: result.size,
          })
          .eq('id', characterId)
          .eq('user_id', userId) // Security: only update user's own characters
          .select()
          .single()

        if (error) {
          console.warn('[CharacterUpload] Failed to update character in Supabase:', error.message)
        } else {
          characterData = data
          console.log('[CharacterUpload] Successfully updated character in Supabase:', data.id)
        }
      } catch (supabaseError) {
        console.warn('[CharacterUpload] Supabase update error:', supabaseError)
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl,
      signedUrl: result.signedUrl,
      key: result.key,
      size: result.size,
      contentType: result.contentType,
      type: 'character',
      character: characterData // Include Supabase character data if saved
    })

  } catch (error) {
    console.error('[CharacterUpload] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false 
      }, 
      { status: 500 }
    )
  }
}
