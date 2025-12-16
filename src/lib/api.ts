// API hooks - Project/Card management removed
// This file is preserved for future data fetching hooks

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Export fetcher for use elsewhere
export { fetcher, useSWR }
