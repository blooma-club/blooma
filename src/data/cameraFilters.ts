export type CameraFilterOption = {
  id: string
  label: string
}

export const cameraFilters: CameraFilterOption[] = [
  { id: 'front', label: 'Front' },
  { id: 'front-side', label: 'Front-side' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
  { id: 'high', label: 'High' },
  { id: 'top', label: 'Top' },
  { id: 'low', label: 'Low' },
  { id: 'selfie', label: 'Selfie' },
]
