import { queryD1 } from './d1'

let charactersTableEnsured = false
let ensureCharactersTablePromise: Promise<void> | null = null

const CHARACTER_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    edit_prompt TEXT,
    image_url TEXT,
    image_key TEXT,
    image_size INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters(user_id)`,
  `CREATE INDEX IF NOT EXISTS characters_project_id_idx ON characters(project_id)`,
  `CREATE INDEX IF NOT EXISTS characters_created_at_idx ON characters(created_at)`
]

export async function ensureCharactersTable(): Promise<void> {
  if (charactersTableEnsured) return

  if (!ensureCharactersTablePromise) {
    ensureCharactersTablePromise = (async () => {
      for (const statement of CHARACTER_TABLE_STATEMENTS) {
        await queryD1(statement)
      }
      charactersTableEnsured = true
      ensureCharactersTablePromise = null
    })().catch(error => {
      ensureCharactersTablePromise = null
      throw error
    })
  }

  return ensureCharactersTablePromise
}
