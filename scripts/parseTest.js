const raw = `**[Title: Small Changes, Big Impact]**

**Scene 1:**
**Shot Description:** A discarded plastic bottle rolls across a parched, cracked earth landscape under a blazing sun.
**Shot:** Extreme Wide Shot
**Angle:** High Angle
**Dialogue/VO:** (Somber tone) "This is our planet..."
**Sound:** Desolate wind sound effect.

**Scene 2:**
**Shot Description:** Close-up on a hand gently placing a reusable shopping bag into a shopping cart overflowing with groceries. Sunlight streams through the grocery store window.
**Shot:** Close-up
**Angle:** Eye Level
**Dialogue/VO:** "But it doesn't have to be."
**Sound:** Gentle, hopeful piano music begins.

**Scene 3:**
**Shot Description:** A split screen. On the left, a faucet gushes water. On the right, a hand turns off the faucet while brushing teeth.
**Shot:** Split Screen, Medium Close-up
**Angle:** Eye Level
**Dialogue/VO:** "Small changes..."
**Sound:** Water SFX fades as faucet is turned off.

**Scene 4:**
**Shot Description:** A person's hands planting a small tree sapling in rich, dark soil. Sunlight dapples through the leaves of nearby trees.
**Shot:** Medium Shot
**Angle:** Low Angle
**Dialogue/VO:** "...make a big difference."
**Sound:** Birds chirping, music swells slightly.

**Scene 5:**
**Shot Description:** Time-lapse of the tree sapling growing into a mature tree over seasons, providing shade and habitat for birds and squirrels.
**Shot:** Long Shot
**Angle:** Eye Level
**Dialogue/VO:** (Uplifting tone) "Protect our home."
**Sound:** Music becomes more vibrant and full.

**Scene 6:**
**Shot Description:** A diverse group of people smiling and working together in a community garden, planting vegetables and flowers.
**Shot:** Medium Shot
**Angle:** Eye Level
**Dialogue/VO:** "Start today! #EcoFriendly #SaveThePlanet"
**Sound:** Upbeat, positive music fades out.`

function extract(label, block) {
  const re = new RegExp(label + "\\s*:\\s*([\\s\\S]*?)(?=\\n[A-Z][^:\\n]{0,40}:|$)", 'i')
  const m = block.match(re)
  return m ? m[1].trim() : undefined
}

function parseScript(raw) {
  // Apply same normalization as the project's parser: remove CR, convert bolded bracket title to Title:, strip remaining ** markers
  let normalized = raw.replace(/\r/g, '')
  normalized = normalized.replace(/^\s*\*\*\[Title:\s*([^\]]+)\]\*\*\s*$/im, (m, p1) => `Title: ${p1.trim()}`)
  normalized = normalized.replace(/\*\*/g, '')
  const headerRegex = /(^|\n)\s*(?:Scene|SCENE|씬)\s*[:#-]?\s*(\d+)?\b([^\n]*)/g
  const indices = []
  let m
  while ((m = headerRegex.exec(normalized))) {
    const fullLabel = `${m[2] || ''} ${m[3] || ''}`.trim()
    indices.push({ idx: m.index + (m[1] ? m[1].length : 0), label: fullLabel, full: m[0] })
  }
  if (indices.length === 0) {
    const legacy = /(^|\n)(Scene\s*\d+[^\n]*)(?:\n|$)/gi
    let lm
    while ((lm = legacy.exec(normalized))) {
      indices.push({ idx: lm.index + (lm[1] ? lm[1].length : 0), label: lm[2], full: lm[0] })
    }
  }
  if (indices.length <= 1) {
    const loose = /(^|\n)\s*(?:.{0,30})?(?:Scene|SCENE|씬)\s*#?\s*\d+/gi
    const looseFound = []
    let lm2
    while ((lm2 = loose.exec(normalized))) {
      looseFound.push({ idx: lm2.index + (lm2[1] ? lm2[1].length : 0), label: (lm2[0] || '').trim() })
    }
    if (looseFound.length > 1) {
      const seen = new Set(indices.map(i => i.idx))
      for (const lf of looseFound) if (!seen.has(lf.idx)) indices.push(lf)
      indices.sort((a,b)=>a.idx-b.idx)
    }
    if (indices.length <= 1) {
      const generic = /(^|\n)\s*(?:Scene|SCENE|씬)\b[^\n]*/gi
      let gm
      const extra = []
      while ((gm = generic.exec(normalized))) {
        extra.push({ idx: gm.index + (gm[1] ? gm[1].length : 0), label: (gm[0] || '').trim() })
      }
      if (extra.length > 1) {
        const seen = new Set(indices.map(i=>i.idx))
        for (const e of extra) if (!seen.has(e.idx)) indices.push(e)
        indices.sort((a,b)=>a.idx-b.idx)
      }
    }
  }
  if (indices.length === 0) return [{ order:0, raw, shotDescription: '' }]
  const scenes = []
  for (let i=0;i<indices.length;i++){
    const start = indices[i].idx
    const end = i+1<indices.length?indices[i+1].idx:normalized.length
    const block = normalized.slice(start,end).trim()
  const headerRaw = indices[i].full || indices[i].label || ''
    const numMatch = headerRaw.match(/(?:Scene|SCENE|씬)\s*#?\s*(\d+)/)
    const sceneNumber = numMatch?Number(numMatch[1]):undefined
    const shotDescriptionRaw = extract('Shot Description', block) || extract('Description', block) || ''
    const shotDescription = shotDescriptionRaw.trim()
    // No per-scene title: only global Title is used. Push scene without title.
      scenes.push({ order:i, raw:block, sceneNumber, shotDescription, shotType: extract('Shot', block), angle: extract('Angle', block), dialogue: extract('Dialogue/VO', block) || extract('Dialogue', block) || extract('VO', block), sound: extract('Sound', block) })
  }
  return scenes
}

const parsed = parseScript(raw)
console.log(JSON.stringify(parsed, null, 2))

// Detect top-level Title like the project's extractTitle() helper would
;(function detectTopTitle(r) {
  let normalized = r.replace(/\r/g, '')
  normalized = normalized.replace(/^\s*\*\*\[Title:\s*([^\]]+)\]\*\*\s*$/im, (m, p1) => `Title: ${p1.trim()}`)
  normalized = normalized.replace(/\*\*/g, '')
  const m = normalized.match(/^\s*(?:\[Title\]|Title)\s*:\s*(.+)$/im)
  const top = m ? m[1].trim() : undefined
  console.log('\n[parseTest] detected topTitle =>', top)
})(raw)
