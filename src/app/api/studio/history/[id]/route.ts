import { NextRequest, NextResponse } from 'next/server'
import { getGeneratedImage, GeneratedImage } from '@/lib/db/generatedImages'
import { reconstructR2Url } from '@/lib/infra/storage'
import { getSupabaseUserAndSync } from '@/lib/db/supabase-server'

export const runtime = 'nodejs'

/**
 * GET /api/studio/history/[id]
 * 단일 이미지 상세 조회 (모달용)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const image = await getGeneratedImage(id, sessionUser.id)

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 })
        }

        // 상세 정보: JSON 필드 파싱 및 URL 처리
        const outfitKeys =
            Array.isArray(image.source_outfit_urls)
                ? image.source_outfit_urls
                : (typeof image.source_outfit_urls === 'string'
                    ? JSON.parse(image.source_outfit_urls)
                    : null)

        // URL 처리 함수: 이미 완전한 URL이면 그대로, R2 키이면 재구성
        const resolveUrl = (url: string | null): string | null => {
            if (!url) return null
            // blob: URL은 이미 만료됨 - null 반환 (표시 안함)
            if (url.startsWith('blob:')) {
                return null
            }
            // 이미 완전한 URL (https://, http://, /로 시작하는 경로)
            if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/')) {
                return url
            }
            // R2 키인 경우에만 재구성
            return reconstructR2Url(url)
        }

        const data = {
            ...image,
            source_model_url: resolveUrl(image.source_model_url),
            source_outfit_urls: outfitKeys ? outfitKeys.map((key: string) => resolveUrl(key)) : null,
            generation_params: image.generation_params && typeof image.generation_params === 'string'
                ? JSON.parse(image.generation_params)
                : image.generation_params ?? null,
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[api/studio/history/[id]] GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }
}
