import type { Card } from '@/types'

export async function fetchCards(projectId: string): Promise<Card[]> {
  const res = await fetch(`/api/cards?project_id=${encodeURIComponent(projectId)}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load cards')
  const json = await res.json().catch(() => ({}))
  return (json?.data ?? []) as Card[]
}

export async function updateCards(cards: Partial<Card>[]): Promise<void> {
  const res = await fetch('/api/cards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards }),
  })
  if (!res.ok) throw new Error('Failed to update cards')
}

export async function deleteCards(cardIds: string[]): Promise<void> {
  const res = await fetch('/api/cards', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardIds }),
  })
  if (!res.ok) throw new Error('Failed to delete cards')
}



