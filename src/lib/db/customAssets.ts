import { queryD1, queryD1Single } from './d1'

let assetsTablesEnsured = false
let ensureAssetsTablesPromise: Promise<void> | null = null

const ASSET_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS uploaded_models (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS uploaded_models_user_id_idx ON uploaded_models(user_id)`,
  `CREATE INDEX IF NOT EXISTS uploaded_models_project_id_idx ON uploaded_models(project_id)`,
  
  `CREATE TABLE IF NOT EXISTS uploaded_backgrounds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    image_key TEXT,
    image_size INTEGER,
    image_content_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS uploaded_backgrounds_user_id_idx ON uploaded_backgrounds(user_id)`,
  `CREATE INDEX IF NOT EXISTS uploaded_backgrounds_project_id_idx ON uploaded_backgrounds(project_id)`
]

export async function ensureAssetsTables(): Promise<void> {
  if (assetsTablesEnsured) return

  if (!ensureAssetsTablesPromise) {
    ensureAssetsTablesPromise = (async () => {
      for (const statement of ASSET_TABLE_STATEMENTS) {
        await queryD1(statement)
      }
      assetsTablesEnsured = true
      ensureAssetsTablesPromise = null
    })().catch(error => {
      ensureAssetsTablesPromise = null
      throw error
    })
  }

  return ensureAssetsTablesPromise
}

export type UploadedAsset = {
  id: string
  user_id: string
  project_id?: string | null
  name: string
  subtitle?: string | null
  image_url: string
  image_key?: string | null
  created_at: string
}

export async function insertUploadedAsset(
  table: 'uploaded_models' | 'uploaded_backgrounds',
  asset: Omit<UploadedAsset, 'created_at' | 'updated_at'> & {
    image_size?: number | null
    image_content_type?: string | null
  }
) {
  await ensureAssetsTables()
  
  const now = new Date().toISOString()
  const sql = `
    INSERT INTO ${table} (
      id, user_id, project_id, name, subtitle, 
      image_url, image_key, image_size, image_content_type, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  
  await queryD1(sql, [
    asset.id,
    asset.user_id,
    asset.project_id || null,
    asset.name,
    asset.subtitle || null,
    asset.image_url,
    asset.image_key || null,
    asset.image_size || null,
    asset.image_content_type || null,
    now,
    now
  ])
  
  return { ...asset, created_at: now, updated_at: now }
}

export async function listUploadedAssets(
  table: 'uploaded_models' | 'uploaded_backgrounds',
  userId: string,
  projectId?: string
): Promise<UploadedAsset[]> {
  await ensureAssetsTables()
  
  let sql = `SELECT * FROM ${table} WHERE user_id = ?`
  const params: any[] = [userId]
  
  if (projectId) {
    sql += ` AND (project_id = ? OR project_id IS NULL)`
    params.push(projectId)
  }
  
  sql += ` ORDER BY created_at DESC`
  
  const results = await queryD1<UploadedAsset>(sql, params)
  return results || []
}

export async function deleteUploadedAsset(
  table: 'uploaded_models' | 'uploaded_backgrounds',
  id: string,
  userId: string
) {
  await ensureAssetsTables()
  
  // Get key first to delete from R2 later if needed
  const asset = await queryD1Single<{ image_key?: string }>(
    `SELECT image_key FROM ${table} WHERE id = ? AND user_id = ?`,
    [id, userId]
  )
  
  if (!asset) return null
  
  await queryD1(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId])
  
  return asset.image_key
}






