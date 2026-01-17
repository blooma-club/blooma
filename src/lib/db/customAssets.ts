import { getSupabaseAdminClient, throwIfSupabaseError } from './db'

export type UploadedAsset = {
  id: string
  user_id: string
  project_id?: string | null
  name: string
  subtitle?: string | null
  image_url: string
  image_key?: string | null
  created_at: string
  is_public?: boolean
}

export async function insertUploadedAsset(
  table: 'uploaded_models' | 'uploaded_locations',
  asset: Omit<UploadedAsset, 'created_at' | 'updated_at'> & {
    image_size?: number | null
    image_content_type?: string | null
  }
) {
  const now = new Date().toISOString()

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from(table).insert({
    id: asset.id,
    user_id: asset.user_id,
    project_id: asset.project_id || null,
    name: asset.name,
    subtitle: asset.subtitle || null,
    image_url: asset.image_url,
    image_key: asset.image_key || null,
    image_size: asset.image_size || null,
    image_content_type: asset.image_content_type || null,
    is_public: asset.is_public ?? false,
    created_at: now,
    updated_at: now,
  })
  throwIfSupabaseError(error, { action: 'insertUploadedAsset', table, userId: asset.user_id })

  return { ...asset, created_at: now, updated_at: now }
}

export async function listUploadedAssets(
  table: 'uploaded_models' | 'uploaded_locations',
  userId: string,
  projectId?: string
): Promise<UploadedAsset[]> {
  const supabase = getSupabaseAdminClient()
  let userQuery = supabase.from(table).select('*').eq('user_id', userId)

  if (projectId) {
    userQuery = userQuery.or(`project_id.eq.${projectId},project_id.is.null`)
  }

  const { data: userAssets, error: userError } = await userQuery
  throwIfSupabaseError(userError, { action: 'listUploadedAssets', table, userId })

  const { data: publicAssets, error: publicError } = await supabase
    .from(table)
    .select('*')
    .eq('is_public', true)
  throwIfSupabaseError(publicError, { action: 'listUploadedAssetsPublic', table })

  const merged = new Map<string, UploadedAsset>()
  for (const asset of userAssets ?? []) {
    merged.set(asset.id, asset)
  }
  for (const asset of publicAssets ?? []) {
    if (!merged.has(asset.id)) {
      merged.set(asset.id, asset)
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aTime = Date.parse(a.created_at)
    const bTime = Date.parse(b.created_at)
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
    return bTime - aTime
  })
}

export async function deleteUploadedAsset(
  table: 'uploaded_models' | 'uploaded_locations',
  id: string,
  userId: string
) {
  const supabase = getSupabaseAdminClient()
  const { data: asset, error } = await supabase
    .from(table)
    .select('image_key, user_id, is_public')
    .eq('id', id)
    .maybeSingle()
  throwIfSupabaseError(error, { action: 'deleteUploadedAsset', table, id, userId })

  if (!asset) return null

  if (asset.user_id !== userId) {
    console.warn(
      `[deleteUploadedAsset] Unauthorized deletion attempt: User ${userId} tried to delete asset ${id} owned by ${asset.user_id}`
    )
    return null
  }

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  throwIfSupabaseError(deleteError, { action: 'deleteUploadedAssetDelete', table, id, userId })

  return asset.image_key
}
