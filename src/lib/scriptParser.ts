export interface ParsedScene {
  order: number
  raw: string
  shotDescription: string
  sceneNumber?: number
  shotType?: string
  angle?: string
  dialogue?: string
  sound?: string
}

function extract(label: string, block: string): string | undefined {
  const re = new RegExp(`${label}\s*:\s*([\s\S]*?)(?=\n[A-Z][^:\n]{0,40}:|$)`, 'i')
  const m = block.match(re)
  return m ? m[1].trim() : undefined
}

export function parseScript(raw: string): ParsedScene[] {
  const normalized = raw.replace(/\r/g, '')
  // Support variants: Scene 1, Scene #1, Scene1, SCENE 1, 씬 1, 씬#1
  // More permissive: optional punctuation after Scene, optional numeric id
  const headerRegex = /(^|\n)\s*(?:Scene|SCENE|씬)\s*[:#-]?\s*(\d+)?\b([^\n]*)/g
  type Idx = { idx: number; label: string; full?: string }
  const indices: Idx[] = []
  let m: RegExpExecArray | null
  while ((m = headerRegex.exec(normalized))) {
    const fullLabel = `${m[2]} ${m[3]}${m[4] || ''}`.trim()
    indices.push({ idx: m.index + (m[1] ? m[1].length : 0), label: fullLabel, full: m[0] })
  }
  // Fallback to legacy pattern
  if (indices.length === 0) {
    const legacy = /(^|\n)(Scene\s*\d+[^\n]*)(?:\n|$)/gi
    let lm: RegExpExecArray | null
    while ((lm = legacy.exec(normalized))) {
      indices.push({ idx: lm.index + (lm[1] ? lm[1].length : 0), label: lm[2], full: lm[0] })
    }
  }
  // If still only one index, try a loose scan to catch different formats
  if (indices.length <= 1) {
    const loose = /(^|\n)\s*(?:.{0,30})?(?:Scene|SCENE|씬)\s*#?\s*\d+/gi
    const looseFound: Idx[] = []
    let lm2: RegExpExecArray | null
    while ((lm2 = loose.exec(normalized))) {
      looseFound.push({ idx: lm2.index + (lm2[1] ? lm2[1].length : 0), label: (lm2[0] || '').trim() })
    }
    if (looseFound.length > 1) {
      const seen = new Set(indices.map(i => i.idx))
      for (const lf of looseFound) {
        if (!seen.has(lf.idx)) {
          indices.push(lf)
        }
      }
      indices.sort((a, b) => a.idx - b.idx)
    }
    // Final generic fallback: look for any line that contains the word 'Scene' or '씬'
    if (indices.length <= 1) {
      const generic = /(^|\n)\s*(?:Scene|SCENE|씬)\b[^\n]*/gi
      let gm: RegExpExecArray | null
      const extra: Idx[] = []
      while ((gm = generic.exec(normalized))) {
        extra.push({ idx: gm.index + (gm[1] ? gm[1].length : 0), label: (gm[0] || '').trim() })
      }
      if (extra.length > 1) {
        const seen = new Set(indices.map(i => i.idx))
        for (const e of extra) {
          if (!seen.has(e.idx)) indices.push(e)
        }
        indices.sort((a, b) => a.idx - b.idx)
      }
    }
  }

  if (indices.length === 0) {
    return [{ order: 0, raw, shotDescription: '' }]
  }

  const scenes: ParsedScene[] = []
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].idx
    const end = i + 1 < indices.length ? indices[i + 1].idx : normalized.length
    const block = normalized.slice(start, end).trim()
    const header = indices[i].label || ''
    const numMatch = header.match(/(?:Scene|SCENE|씬)\s*#?\s*(\d+)/)
    const sceneNumber = numMatch ? Number(numMatch[1]) : undefined
    const shotDescriptionRaw = extract('Shot Description', block) || extract('Description', block) || ''
    const shotDescription = shotDescriptionRaw.trim()
    scenes.push({
      order: i,
      raw: block,
      sceneNumber,
      shotDescription,
      shotType: extract('Shot', block),
      angle: extract('Angle', block),
      dialogue: extract('Dialogue/VO', block) || extract('Dialogue', block) || extract('VO', block),
      sound: extract('Sound', block)
    })
  }
  return scenes
}

export function extractTitle(raw: string): string | undefined {
  if (!raw) return undefined
  // Match lines like: Title: My Story or [Title]: My Story (case-insensitive)
  const re = /^\s*(?:\[Title\]|Title)\s*:\s*(.+)$/im
  const m = raw.match(re)
  return m ? m[1].trim() : undefined
}

export function stripTitle(raw: string): string {
  if (!raw) return raw
  const re = /^\s*(?:\[Title\]|Title)\s*:\s*.*(?:\n|$)/im
  return raw.replace(re, '').replace(/^\n+/, '')
}
