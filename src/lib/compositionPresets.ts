export type CompositionPreset = {
    id: string
    title: string
    prompt: string
    image?: string
    isBuiltIn?: boolean
}

export const COMPOSITION_PRESETS: CompositionPreset[] = [
    {
        id: 'front',
        title: 'Front',
        prompt: 'eye-level shot, 50mm lens, centered framing, soft studio lighting, sharp focus',
        image: '/front-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'behind',
        title: 'Rear',
        prompt: 'centered framing, 50mm lens, soft studio lighting, clear posture',
        image: '/behind-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'side',
        title: 'Side',
        prompt: '35mm lens, clear silhouette, soft studio lighting, minimalist framing',
        image: '/side-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'quarter',
        title: 'Quarter',
        prompt: '35mm lens, soft studio lighting, clean background, professional lookbook style',
        image: '/front-side-view-v2-thumb.png',
        isBuiltIn: true,
    },
]
