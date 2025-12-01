export interface BackgroundCandidate {
    id: string
    url: string
    source: 'uploaded' | 'generated' | 'extracted'
    createdAt: string
}
