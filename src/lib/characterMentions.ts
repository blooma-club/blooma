import type { SupabaseCharacter } from '@/lib/supabase'

type CharacterCamelCaseExtras = {
  editPrompt?: string | null
  imageUrl?: string | null
  originalImageUrl?: string | null
}

export interface CharacterMention {
  character: SupabaseCharacter
  slug: string
  snippet: string
  imageUrls: string[]
}

const MENTION_REGEX = /@([a-z0-9][a-z0-9_\-]*)/gi

export function getCharacterMentionSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildCharacterSnippet(character: SupabaseCharacter): string {
  const extras = character as CharacterCamelCaseExtras
  const parts: string[] = []
  if (character.name?.trim()) parts.push(character.name.trim())
  if (character.description?.trim()) parts.push(character.description.trim())
  const editPrompt = extras.editPrompt ?? character.edit_prompt
  if (typeof editPrompt === 'string' && editPrompt.trim()) {
    parts.push(editPrompt.trim())
  }
  return parts.join(', ')
}

export function resolveCharacterMentions(
  text: string,
  characters: SupabaseCharacter[]
): CharacterMention[] {
  if (!text || characters.length === 0) return []

  const mentionSlugs = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const slug = match[1]?.toLowerCase()
    if (slug) mentionSlugs.add(slug)
  }

  if (mentionSlugs.size === 0) return []

  const characterLookup = new Map<string, SupabaseCharacter>()
  for (const character of characters) {
    const slug = getCharacterMentionSlug(character.name || '')
    if (slug) {
      characterLookup.set(slug, character)
    }
  }

  const mentions: CharacterMention[] = []
  for (const slug of mentionSlugs) {
    const character = characterLookup.get(slug)
    if (!character) continue

    const snippet = buildCharacterSnippet(character)
    const extras = character as CharacterCamelCaseExtras
    const imageUrls = [
      extras.imageUrl,
      character.image_url,
      extras.originalImageUrl,
      character.original_image_url,
    ]
      .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))

    mentions.push({ character, slug, snippet, imageUrls })
  }

  return mentions
}

export function buildPromptWithCharacterMentions(
  prompt: string,
  mentions: CharacterMention[]
): string {
  if (!prompt || mentions.length === 0) return prompt

  let result = prompt

  for (const mention of mentions) {
    const regex = new RegExp(`@${mention.slug}`, 'gi')
    result = result.replace(regex, mention.character.name || mention.slug)
  }

  const details = mentions
    .map(mention => mention.snippet)
    .filter(Boolean)

  if (details.length > 0) {
    result = `${result}\nCharacter references: ${details.join(' | ')}`
  }

  return result
}
