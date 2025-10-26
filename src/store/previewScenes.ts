import { create } from 'zustand'

type SceneModelMetadata = {
  characterId: string
  characterName: string
  characterHandle?: string
  characterImageUrl?: string
  modelId: string
  modelLabel: string
}

type SceneEntry = {
  id: string
  order: number
  title: string
  raw: string
  description?: string
  metadata: SceneModelMetadata[]
}

type InitializeSceneArgs = {
  id: string
  order: number
  title: string
  raw: string
  description?: string
}

type PreviewScenesState = {
  scenes: SceneEntry[]
  initializeScenes: (scenes: InitializeSceneArgs[]) => void
  assignCharacterToScene: (sceneId: string, metadata: SceneModelMetadata) => void
  removeCharacterFromScene: (sceneId: string, characterId: string) => void
  clearSceneAssignments: (sceneId: string) => void
}

export const usePreviewScenesStore = create<PreviewScenesState>((set, get) => ({
  scenes: [],
  initializeScenes: seeds => {
    set(state => {
      const existing = new Map(state.scenes.map(scene => [scene.id, scene.metadata]))
      return {
        scenes: seeds
          .map(seed => ({
            id: seed.id,
            order: seed.order,
            title: seed.title,
            raw: seed.raw,
            description: seed.description,
            metadata: existing.get(seed.id) ?? [],
          }))
          .sort((a, b) => a.order - b.order),
      }
    })
  },
  assignCharacterToScene: (sceneId, metadata) => {
    set(state => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              metadata: [
                metadata,
                ...scene.metadata.filter(entry => entry.characterId !== metadata.characterId),
              ],
            }
          : scene
      ),
    }))
  },
  removeCharacterFromScene: (sceneId, characterId) => {
    set(state => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              metadata: scene.metadata.filter(entry => entry.characterId !== characterId),
            }
          : scene
      ),
    }))
  },
  clearSceneAssignments: sceneId => {
    set(state => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId ? { ...scene, metadata: [] } : scene
      ),
    }))
  },
}))

export type { SceneEntry, SceneModelMetadata }
