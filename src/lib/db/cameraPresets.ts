import { queryD1, queryD1Single } from './d1'

let cameraPresetsTableEnsured = false
let ensureCameraPresetsTablePromise: Promise<void> | null = null

const CAMERA_PRESETS_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS camera_presets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS camera_presets_user_id_idx ON camera_presets(user_id)`,
]

export async function ensureCameraPresetsTable(): Promise<void> {
  if (cameraPresetsTableEnsured) return

  if (!ensureCameraPresetsTablePromise) {
    ensureCameraPresetsTablePromise = (async () => {
      for (const statement of CAMERA_PRESETS_TABLE_STATEMENTS) {
        await queryD1(statement)
      }
      cameraPresetsTableEnsured = true
      ensureCameraPresetsTablePromise = null
    })().catch(error => {
      ensureCameraPresetsTablePromise = null
      throw error
    })
  }

  return ensureCameraPresetsTablePromise
}

export type CameraPresetRecord = {
  id: string
  user_id: string
  title: string
  prompt: string
  created_at: string
  updated_at: string
}

export type CameraPresetInput = {
  id: string
  title: string
  prompt: string
}

/**
 * 사용자의 커스텀 카메라 프리셋 목록 조회
 */
export async function listCameraPresets(userId: string): Promise<CameraPresetRecord[]> {
  await ensureCameraPresetsTable()

  const sql = `
    SELECT id, user_id, title, prompt, created_at, updated_at 
    FROM camera_presets 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `

  const results = await queryD1<CameraPresetRecord>(sql, [userId])
  return results || []
}

/**
 * 새 카메라 프리셋 생성
 */
export async function createCameraPreset(
  userId: string,
  preset: CameraPresetInput
): Promise<CameraPresetRecord> {
  await ensureCameraPresetsTable()

  const now = new Date().toISOString()
  const sql = `
    INSERT INTO camera_presets (id, user_id, title, prompt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `

  await queryD1(sql, [preset.id, userId, preset.title, preset.prompt, now, now])

  return {
    id: preset.id,
    user_id: userId,
    title: preset.title,
    prompt: preset.prompt,
    created_at: now,
    updated_at: now,
  }
}

/**
 * 카메라 프리셋 업데이트
 */
export async function updateCameraPreset(
  userId: string,
  presetId: string,
  updates: Partial<Pick<CameraPresetInput, 'title' | 'prompt'>>
): Promise<CameraPresetRecord | null> {
  await ensureCameraPresetsTable()

  const assignments: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) {
    assignments.push('title = ?')
    values.push(updates.title)
  }

  if (updates.prompt !== undefined) {
    assignments.push('prompt = ?')
    values.push(updates.prompt)
  }

  if (assignments.length === 0) {
    return null
  }

  assignments.push('updated_at = ?')
  values.push(new Date().toISOString())

  values.push(presetId, userId)

  const sql = `
    UPDATE camera_presets 
    SET ${assignments.join(', ')} 
    WHERE id = ? AND user_id = ?
  `

  await queryD1(sql, values)

  return queryD1Single<CameraPresetRecord>(
    `SELECT * FROM camera_presets WHERE id = ? AND user_id = ?`,
    [presetId, userId]
  )
}

/**
 * 카메라 프리셋 삭제
 */
export async function deleteCameraPreset(userId: string, presetId: string): Promise<boolean> {
  await ensureCameraPresetsTable()

  const existing = await queryD1Single<{ id: string }>(
    `SELECT id FROM camera_presets WHERE id = ? AND user_id = ?`,
    [presetId, userId]
  )

  if (!existing) return false

  await queryD1(`DELETE FROM camera_presets WHERE id = ? AND user_id = ?`, [presetId, userId])

  return true
}

/**
 * 단일 카메라 프리셋 조회
 */
export async function getCameraPreset(
  userId: string,
  presetId: string
): Promise<CameraPresetRecord | null> {
  await ensureCameraPresetsTable()

  return queryD1Single<CameraPresetRecord>(
    `SELECT * FROM camera_presets WHERE id = ? AND user_id = ?`,
    [presetId, userId]
  )
}

