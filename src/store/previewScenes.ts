import { create } from 'zustand'

type SceneModelMetadata = {
  modelId: string
  modelName: string
  modelHandle?: string
  modelImageUrl?: string
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
  assignModelToScene: (sceneId: string, metadata: SceneModelMetadata) => void
  removeModelFromScene: (sceneId: string, modelId: string) => void
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
  assignModelToScene: (sceneId, metadata) => {
    set(state => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              metadata: [
                metadata,
                ...scene.metadata.filter(entry => entry.modelId !== metadata.modelId),
              ],
            }
          : scene
      ),
    }))
  },
  removeModelFromScene: (sceneId, modelId) => {
    set(state => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              metadata: scene.metadata.filter(entry => entry.modelId !== modelId),
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
