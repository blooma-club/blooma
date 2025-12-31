import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listGeneratedImages } from '@/lib/db/generatedImages'

export const runtime = 'nodejs'

/**
 * GET /api/generated-images
 * Fetch a list of generated images for the authenticated user.
 * 
 * Query Parameters:
 * - limit: Number of images to return (default: 24)
 * - offset: Number of images to skip (default: 0)
 * - favorites: 'true' to filter by favorites only
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '24', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const favoritesOnly = searchParams.get('favorites') === 'true'

        const images = await listGeneratedImages(userId, { limit, offset, favoritesOnly })

        return NextResponse.json({
            success: true,
            data: images,
            // Simple heuristic for hasMore. 
            // Ideally listGeneratedImages should return total count or we fetch limit + 1
            hasMore: images.length === limit
        }, {
            headers: {
                // Cache for 30s locally, stale-while-revalidate for 5m
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=300'
            }
        })
    } catch (error) {
        console.error('[api/generated-images] GET error:', error)
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
    }
}
