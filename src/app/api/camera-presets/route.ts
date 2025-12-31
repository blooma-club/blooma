import { NextRequest } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import {
  listCameraPresets,
  createCameraPreset,
  deleteCameraPreset,
} from '@/lib/db/cameraPresets'
import { z } from 'zod'

export const runtime = 'nodejs'

const handleError = createErrorHandler('api/camera-presets')

const createPresetSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be 2000 characters or less'),
})

/**
 * GET /api/camera-presets
 * 사용자의 커스텀 카메라 프리셋 목록 조회
 */
export async function GET() {
  try {
    const { userId } = await requireAuth()
    const presets = await listCameraPresets(userId)

    return createApiResponse({
      presets: presets.map(p => ({
        id: p.id,
        title: p.title,
        prompt: p.prompt,
        isBuiltIn: false,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/camera-presets
 * 새 카메라 프리셋 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await request.json()
    const validated = createPresetSchema.parse(body)

    const preset = await createCameraPreset(userId, {
      id: validated.id,
      title: validated.title,
      prompt: validated.prompt,
    })

    return createApiResponse({
      preset: {
        id: preset.id,
        title: preset.title,
        prompt: preset.prompt,
        isBuiltIn: false,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/camera-presets
 * 카메라 프리셋 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { searchParams } = new URL(request.url)
    const presetId = searchParams.get('id')

    if (!presetId) {
      throw ApiError.badRequest('Preset ID is required')
    }

    const deleted = await deleteCameraPreset(userId, presetId)

    if (!deleted) {
      throw ApiError.notFound('Preset not found')
    }

    return createApiResponse({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
