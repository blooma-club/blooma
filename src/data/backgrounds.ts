export type BackgroundOption = {
  id: string
  label: string
  image_url: string
}

export const backgroundOptions: BackgroundOption[] = [
  { id: 'white-background', label: 'White background', image_url: '/backgrounds/white-background.svg' },
  { id: 'tbd', label: 'Tbd', image_url: '/backgrounds/tbd-background.svg' },
]
