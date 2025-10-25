import { CHARACTER_SYSTEM_PROMPT } from './constants'

export const ensureCharacterStyle = (prompt: string) => {
  const trimmed = (prompt || '').trim()
  if (!trimmed) return CHARACTER_SYSTEM_PROMPT

  const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase()
  if (normalized.includes('full body shot of')) {
    return trimmed
  }

  return `${trimmed}\n\n${CHARACTER_SYSTEM_PROMPT}`
}

