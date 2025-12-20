/**
 * Generated Images Database Layer
 * 
 * Studio에서 생성된 이미지를 저장하고 관리합니다.
 */

import { queryD1, queryD1Single, queryD1Batch } from './d1'

let generatedImagesTableEnsured = false
let ensureGeneratedImagesTablePromise: Promise<void> | null = null

const GENERATED_IMAGES_TABLE_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    group_id TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    prompt TEXT,
    model_id TEXT,
    source_model_url TEXT,
    source_outfit_urls TEXT,
    generation_params TEXT,
    credit_cost INTEGER DEFAULT 1,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
    `CREATE INDEX IF NOT EXISTS generated_images_user_id_idx ON generated_images(user_id)`,
    `CREATE INDEX IF NOT EXISTS generated_images_created_at_idx ON generated_images(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS generated_images_group_id_idx ON generated_images(group_id)`,
    // 복합 인덱스: 쿼리 패턴 (user_id, created_at DESC)에 최적화
    `CREATE INDEX IF NOT EXISTS generated_images_user_created_idx ON generated_images(user_id, created_at DESC)`,
]

/**
 * 테이블 생성 보장
 * queryD1Batch를 사용하여 모든 CREATE 문을 1회 HTTP 요청으로 실행
 */
export async function ensureGeneratedImagesTable(): Promise<void> {
    if (generatedImagesTableEnsured) return

    if (!ensureGeneratedImagesTablePromise) {
        ensureGeneratedImagesTablePromise = (async () => {
            try {
                // 모든 statement를 batch로 한 번에 실행 (4회 HTTP → 1회)
                await queryD1Batch(
                    GENERATED_IMAGES_TABLE_STATEMENTS.map(sql => ({ sql, params: [] }))
                )
                generatedImagesTableEnsured = true
            } catch (error) {
                console.warn('[GeneratedImages] Failed to ensure table (batch):', error)
            } finally {
                ensureGeneratedImagesTablePromise = null
            }
        })()
    }

    return ensureGeneratedImagesTablePromise
}


export interface GeneratedImage {
    id: string
    user_id: string
    group_id: string | null
    image_url: string
    image_key: string | null
    prompt: string | null
    model_id: string | null
    source_model_url: string | null
    source_outfit_urls: string | null // JSON array
    generation_params: string | null // JSON object
    credit_cost: number
    is_favorite: number // 0 or 1
    created_at: string
    updated_at: string
}

export interface CreateGeneratedImageInput {
    id: string
    user_id: string
    group_id?: string | null
    image_url: string
    image_key?: string | null
    prompt?: string | null
    model_id?: string | null
    source_model_url?: string | null
    source_outfit_urls?: string[] | null
    generation_params?: Record<string, unknown> | null
    credit_cost?: number
}

/**
 * 새 생성 이미지 저장
 */
export async function createGeneratedImage(input: CreateGeneratedImageInput): Promise<GeneratedImage> {
    await ensureGeneratedImagesTable()

    const now = new Date().toISOString()

    const sourceOutfitUrlsJson = input.source_outfit_urls
        ? JSON.stringify(input.source_outfit_urls)
        : null

    const generationParamsJson = input.generation_params
        ? JSON.stringify(input.generation_params)
        : null

    await queryD1(
        `INSERT INTO generated_images (
      id, user_id, group_id, image_url, image_key, prompt, model_id,
      source_model_url, source_outfit_urls, generation_params,
      credit_cost, is_favorite, created_at, updated_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, ?12, ?12
    )`,
        [
            input.id,
            input.user_id,
            input.group_id ?? null,
            input.image_url,
            input.image_key ?? null,
            input.prompt ?? null,
            input.model_id ?? null,
            input.source_model_url ?? null,
            sourceOutfitUrlsJson,
            generationParamsJson,
            input.credit_cost ?? 1,
            now,
        ]
    )

    return {
        id: input.id,
        user_id: input.user_id,
        group_id: input.group_id ?? null,
        image_url: input.image_url,
        image_key: input.image_key ?? null,
        prompt: input.prompt ?? null,
        model_id: input.model_id ?? null,
        source_model_url: input.source_model_url ?? null,
        source_outfit_urls: sourceOutfitUrlsJson,
        generation_params: generationParamsJson,
        credit_cost: input.credit_cost ?? 1,
        is_favorite: 0,
        created_at: now,
        updated_at: now,
    }
}

/**
 * 그리드용 슬림 이미지 타입
 */
export interface GeneratedImageSlim {
    id: string
    group_id: string | null
    image_url: string
    prompt: string | null
    created_at: string
}

/**
 * 사용자의 생성 이미지 목록 조회 (그리드용 슬림 응답)
 */
export async function listGeneratedImages(
    userId: string,
    options?: { limit?: number; offset?: number; favoritesOnly?: boolean }
): Promise<GeneratedImageSlim[]> {
    await ensureGeneratedImagesTable()

    const limit = options?.limit ?? 24
    const offset = options?.offset ?? 0
    const favoritesOnly = options?.favoritesOnly ?? false

    // 그리드에 필요한 필드만 조회 (응답 크기 감소)
    let sql = `SELECT id, group_id, image_url, prompt, created_at FROM generated_images WHERE user_id = ?1`

    if (favoritesOnly) {
        sql += ` AND is_favorite = 1`
    }

    sql += ` ORDER BY created_at DESC LIMIT ?2 OFFSET ?3`

    return queryD1<GeneratedImageSlim>(sql, [userId, limit, offset])
}

/**
 * 단일 이미지 조회
 */
export async function getGeneratedImage(
    id: string,
    userId: string
): Promise<GeneratedImage | null> {
    await ensureGeneratedImagesTable()

    return queryD1Single<GeneratedImage>(
        `SELECT * FROM generated_images WHERE id = ?1 AND user_id = ?2`,
        [id, userId]
    )
}

/**
 * 이미지 삭제
 */
export async function deleteGeneratedImage(
    id: string,
    userId: string
): Promise<{ imageKey: string | null } | null> {
    await ensureGeneratedImagesTable()

    // 삭제 전 image_key 조회
    const image = await queryD1Single<{ image_key: string | null }>(
        `SELECT image_key FROM generated_images WHERE id = ?1 AND user_id = ?2`,
        [id, userId]
    )

    if (!image) return null

    await queryD1(
        `DELETE FROM generated_images WHERE id = ?1 AND user_id = ?2`,
        [id, userId]
    )

    return { imageKey: image.image_key }
}

/**
 * 즐겨찾기 토글
 */
export async function toggleFavorite(
    id: string,
    userId: string
): Promise<boolean | null> {
    await ensureGeneratedImagesTable()

    const image = await queryD1Single<{ is_favorite: number }>(
        `SELECT is_favorite FROM generated_images WHERE id = ?1 AND user_id = ?2`,
        [id, userId]
    )

    if (!image) return null

    const newFavoriteStatus = image.is_favorite === 1 ? 0 : 1
    const now = new Date().toISOString()

    await queryD1(
        `UPDATE generated_images SET is_favorite = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4`,
        [newFavoriteStatus, now, id, userId]
    )

    return newFavoriteStatus === 1
}

/**
 * 사용자의 생성 이미지 개수 조회
 */
export async function countGeneratedImages(userId: string): Promise<number> {
    await ensureGeneratedImagesTable()

    const result = await queryD1Single<{ count: number }>(
        `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ?1`,
        [userId]
    )

    return result?.count ?? 0
}
