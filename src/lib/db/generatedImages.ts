/**
 * Generated images database layer.
 */

import { getSupabaseAdminClient, throwIfSupabaseError } from './db'

export interface GeneratedImage {
    id: string
    user_id: string
    group_id: string | null
    image_url: string
    image_key: string | null
    prompt: string | null
    model_id: string | null
    source_model_url: string | null
    source_outfit_urls: string[] | string | null
    generation_params: Record<string, unknown> | string | null
    credit_cost: number
    is_favorite: boolean
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
 * Creates a generated image record.
 */
export async function createGeneratedImage(input: CreateGeneratedImageInput): Promise<GeneratedImage> {
    const now = new Date().toISOString()

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('generated_images').insert({
        id: input.id,
        user_id: input.user_id,
        group_id: input.group_id ?? null,
        image_url: input.image_url,
        image_key: input.image_key ?? null,
        prompt: input.prompt ?? null,
        model_id: input.model_id ?? null,
        source_model_url: input.source_model_url ?? null,
        source_outfit_urls: input.source_outfit_urls ?? null,
        generation_params: input.generation_params ?? null,
        credit_cost: input.credit_cost ?? 1,
        is_favorite: false,
        created_at: now,
        updated_at: now,
    })
    throwIfSupabaseError(error, { action: 'createGeneratedImage', userId: input.user_id })

    return {
        id: input.id,
        user_id: input.user_id,
        group_id: input.group_id ?? null,
        image_url: input.image_url,
        image_key: input.image_key ?? null,
        prompt: input.prompt ?? null,
        model_id: input.model_id ?? null,
        source_model_url: input.source_model_url ?? null,
        source_outfit_urls: input.source_outfit_urls ?? null,
        generation_params: input.generation_params ?? null,
        credit_cost: input.credit_cost ?? 1,
        is_favorite: false,
        created_at: now,
        updated_at: now,
    }
}

export interface GeneratedImageSlim {
    id: string
    group_id: string | null
    image_url: string
    prompt: string | null
    created_at: string
}

/**
 * Lists generated images for the gallery.
 */
export async function listGeneratedImages(
    userId: string,
    options?: { limit?: number; offset?: number; favoritesOnly?: boolean }
): Promise<GeneratedImageSlim[]> {
    const limit = options?.limit ?? 24
    const offset = options?.offset ?? 0
    const favoritesOnly = options?.favoritesOnly ?? false

    const supabase = getSupabaseAdminClient()
    let query = supabase
        .from('generated_images')
        .select('id, group_id, image_url, prompt, created_at')
        .eq('user_id', userId)

    if (favoritesOnly) {
        query = query.eq('is_favorite', true)
    }

    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    throwIfSupabaseError(error, { action: 'listGeneratedImages', userId })
    return data ?? []
}

/**
 * Gets a single generated image.
 */
export async function getGeneratedImage(
    id: string,
    userId: string
): Promise<GeneratedImage | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()

    throwIfSupabaseError(error, { action: 'getGeneratedImage', userId, id })
    return data ?? null
}

/**
 * Deletes a generated image.
 */
export async function deleteGeneratedImage(
    id: string,
    userId: string
): Promise<{ imageKey: string | null } | null> {
    const supabase = getSupabaseAdminClient()
    const { data: image, error } = await supabase
        .from('generated_images')
        .select('image_key')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
    throwIfSupabaseError(error, { action: 'deleteGeneratedImage', userId, id })

    if (!image) return null

    const { error: deleteError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    throwIfSupabaseError(deleteError, { action: 'deleteGeneratedImageDelete', userId, id })

    return { imageKey: image.image_key }
}

/**
 * Toggles favorite status for a generated image.
 */
export async function toggleFavorite(
    id: string,
    userId: string
): Promise<boolean | null> {
    const supabase = getSupabaseAdminClient()
    const { data: image, error } = await supabase
        .from('generated_images')
        .select('is_favorite')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
    throwIfSupabaseError(error, { action: 'toggleFavoriteLookup', userId, id })

    if (!image) return null

    const newFavoriteStatus = image.is_favorite ? false : true
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
        .from('generated_images')
        .update({ is_favorite: newFavoriteStatus, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
    throwIfSupabaseError(updateError, { action: 'toggleFavoriteUpdate', userId, id })

    return newFavoriteStatus
}

/**
 * Counts generated images for a user.
 */
export async function countGeneratedImages(userId: string): Promise<number> {
    const supabase = getSupabaseAdminClient()
    const { count, error } = await supabase
        .from('generated_images')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

    throwIfSupabaseError(error, { action: 'countGeneratedImages', userId })
    return count ?? 0
}
