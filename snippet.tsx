'use client'

import CharacterWizard from '@/components/project/setup/CharacterWizard'

// Render the existing character wizard in isolation for documentation or previews.
// Any data handling is stubbed, so the component simply runs with empty callbacks.
export default function Wrapper() {
  return <CharacterWizard onChange={() => {}} initial={[]} />
}
