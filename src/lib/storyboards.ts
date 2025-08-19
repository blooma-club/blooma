type Frame = { id: string; sceneId?: number; index: number; title?: string; summary?: string; prompt?: string; thumbUrl?: string }

type Storyboard = { id: string; projectId?: string; frames: Frame[] }

const store = new Map<string, Storyboard>()

export function saveStoryboard(sb: Storyboard) {
  store.set(sb.id, sb)
}

export function getStoryboard(id: string) {
  return store.get(id) || null
}

export function generateMockStoryboard(projectId: string | undefined, script: string, style?: string, ratio?: string) : Storyboard {
  // Very simple parser: split by double newlines into scenes
  const scenes = script.split(/\n{2,}/).filter(s => s.trim())
  const frames = scenes.map((s, i) => ({ id: `${Date.now()}-${i}`, sceneId: i+1, index: i, title: `Scene ${i+1}`, summary: s.slice(0, 400), prompt: `Render: ${s.slice(0,200)} -- style:${style} ratio:${ratio}` }))
  const id = `sb_${Date.now()}`
  const sb = { id, projectId, frames }
  store.set(id, sb)
  return sb
}
