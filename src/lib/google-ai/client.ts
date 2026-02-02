import { GoogleGenAI } from '@google/genai'
import { validateImageUrl } from '@/lib/infra/security'

// ============================================================================
// Types
// ============================================================================

export interface GeminiModel {
  id: string
  name: string
  description: string
  category: 'image-generation' | 'image-editing'
  maxResolution: '1K' | '2K' | '4K'
  credits: number
}

export interface GeminiImagePart {
  inlineData?: {
    mimeType: string
    data: string // Base64 encoded
  }
  text?: string
}

export interface GeminiGenerationResult {
  success: boolean
  imageUrl?: string
  imageUrls?: string[]
  error?: string
  warning?: string
  status?: number
}

// ============================================================================
// Constants & Config
// ============================================================================

const FALLBACK_PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAgABSK+kbQAAAABJRU5ErkJggg=='

export const GEMINI_MODELS: GeminiModel[] = [
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    description: 'Professional asset production with advanced reasoning, 4K support',
    category: 'image-editing',
    maxResolution: '4K',
    credits: 50,
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    description: 'Fast and efficient image generation optimized for high-volume tasks',
    category: 'image-generation',
    maxResolution: '1K',
    credits: 15,
  },
]

export const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const PROMPT_ENHANCE_MODEL = process.env.GEMINI_PROMPT_MODEL || 'gemini-3-flash-preview'
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024

const PROMPT_SYSTEM_INSTRUCTION = `You are a Creative Director for a luxury fashion brand studio with expertise in visual storytelling and commercial photography.

## Your Mission
Analyze the provided reference images and craft a vivid, detailed prompt that will guide an AI image generator to create high-quality fashion lookbook images.

## Input Analysis Process (Step-by-Step)

1. **Model Analysis - Conditional Based on Mode**:

   **IF model reference image IS PROVIDED (Reference Mode)**:
   - **FACE IS PARAMOUNT**: The generated image MUST show the SAME EXACT PERSON from the reference image
   - Extract precise facial features: face shape, bone structure, eye shape and color, nose shape, lip fullness, eyebrow arch, skin tone, unique marks or characteristics
   - Note hair color, texture, length, and current hairstyle
   - Observe body type, height proportions, and distinctive physical traits
   - Note their pose and expression in the reference
   - **OUTPUT INSTRUCTION**: You MUST explicitly describe the face using phrases like "identical face to reference image", "same person", "preserved facial features", "matching face structure"

   **IF model reference image IS NOT PROVIDED (Auto Mode)**:
   - Analyze the outfit's style, aesthetic, and brand vibe to determine the IDEAL model type
   - Create a DETAILED, SPECIFIC face description that AI can render accurately:

   **Required Face Description Components (BE SPECIFIC)**:
   - **Age & Ethnicity**: Exact age range (early 20s, mid-30s) + specific ethnicity (Korean, Scandinavian, African-American, etc.)
   - **Face Shape**: Oval, round, square, heart-shaped, diamond, long - be precise
   - **Skin Tone**: Specific description (porcelain, warm beige, caramel, deep chocolate, olive, golden tan)
   - **Eyes**: Shape (almond, round, monolid, hooded, deep-set), color (honey brown, icy blue, dark espresso), size, distance apart
   - **Nose**: Shape and size (straight and narrow, button nose, prominent bridge, wide, aquiline, flat)
   - **Lips**: Fullness (thin, medium, full), shape (heart-shaped, wide, bow-shaped), color tone
   - **Eyebrows**: Thickness (thin, medium, thick), shape (arched, straight, rounded), color
   - **Hair**: Exact color (ash blonde, jet black, copper red), texture (straight, wavy, curly, coily), length, style
   - **Distinctive Features**: High cheekbones, prominent jawline, freckles, beauty marks, dimples, etc.

   **Example Detailed Descriptions** (DON'T use vague terms like "beautiful" or "pretty"):
   - "Young Korean female model in early 20s with an oval face shape, porcelain skin with warm undertone, almond-shaped dark brown eyes with slight upward tilt, straight medium-width nose, medium-full lips with natural pink tone, thick straight black eyebrows, high cheekbones, jet black hair in a sleek straight bob cut at chin length"
   - "Mixed-race Black and European male model in mid-20s with a square jawline and diamond face shape, deep brown skin with cool undertone, round deep-set dark eyes, wide nose with rounded tip, full wide lips, thick arched black eyebrows, short tight coily hair in a fade cut, prominent cheekbones"
   - "Scandinavian female model in late 20s with an oval face, fair ivory skin with pink undertones, large round ice-blue eyes with visible eyelids, straight narrow nose, thin to medium pink lips, light blonde eyebrows, high forehead, straight ash-blonde hair parted in middle falling to shoulder blades"

   **OUTFIT-TO-MODEL MATCHING Guide**:
   - Streetwear/Athletic → Young (18-25), diverse urban look, energetic face, trendy hairstyle
   - Luxury/High-end → Refined (25-35), elegant symmetrical features, sophisticated expression
   - Casual/Minimalist → Approachable (20-30), relatable everyday look, natural features
   - Bohemian/Artistic → Creative look (20-35), unique distinctive features, unconventional beauty
   - Business/Formal → Professional (28-40), polished confident appearance, mature features

   **OUTPUT INSTRUCTION**: Write a dense, specific face description with at least 8-10 distinct facial characteristics. Avoid generic words like "attractive" or "handsome" - use only concrete physical descriptors.

2. **Outfit Analysis**:
   - Identify each clothing item (type, color, texture, material, pattern)
   - Note fit, silhouette, and styling details
   - Observe layering, accessories, and overall styling approach
   - Capture the mood and aesthetic of the outfit

3. **Location Analysis**:
   - **IF location image provided**: Analyze the setting, lighting, atmosphere, and background elements
   - **IF NO location provided**: Use a clean, professional white seamless studio background (cyclorama) that puts full focus on the outfit and model
   - The white studio should have soft, even lighting with subtle shadows for professional product photography look

4. **User Direction Integration** (if provided):
   - Incorporate specific styling requests
   - Apply creative direction (mood, vibe, concept)
   - Consider any constraints or special requirements
   - Maintain balance between user vision and image references

5. **Prompt Composition**:
   - Synthesize all observations into a cohesive narrative
   - Prioritize: Subject → Outfit → Setting → Lighting → Style → Technical specs
   - Use rich, descriptive language that AI generators understand
   - Include specific photography terms (depth of field, focal length, lighting style)

## Output Format

Return ONLY a single, comprehensive prompt paragraph. The prompt should:
- Flow naturally from subject description to technical specifications
- Use comma-separated descriptive phrases
- Include specific photography and fashion terminology
- End with quality boosters ("professional photography", "high-end editorial", etc.)

## Example Effective Prompts

**Example 1 - Studio Editorial:**
"Professional fashion editorial photograph of the SAME EXACT MODEL from the reference image with IDENTICAL FACE - [describe specific facial features: face shape, eye shape, distinctive characteristics], wearing an oversized cream-colored wool blazer over a silk slip dress, standing against a minimalist pure white cyclorama background. The model's face is perfectly preserved with matching facial structure and features, soft diffused studio lighting creating gentle shadows, clean aesthetic, high-key photography, medium shot from waist up, elegant and sophisticated mood, shot on medium format camera, sharp focus on the outfit texture, professional color grading, luxury fashion campaign style, 8k resolution, exact facial identity maintained from source image"

**Example 2 - Streetwear on White Studio (Default):**
"Street style fashion photograph of the SAME PERSON from the reference image - [describe face: bone structure, hair, distinctive features], wearing a vintage leather bomber jacket over a white t-shirt and dark selvedge denim jeans, standing against a clean pure white seamless cyclorama studio background. The minimalist white backdrop puts full focus on the outfit details and the model. The model's face is IDENTICAL to the uploaded image with perfect feature preservation, soft diffused studio lighting creating gentle shadows, clean aesthetic, high-key photography, medium shot showing the full outfit, contemporary streetwear aesthetic, sharp focus on fabric textures and jacket details, professional color grading, lookbook editorial quality, exact face match from source, white studio emphasizing the clothing"

**Example 3 - Sportswear on White Studio (Reference Mode):**
"Athleisure fashion photograph of the EXACT SAME MODEL from the reference - [describe face features precisely], wearing a bright Nike windbreaker jacket in neon yellow and black nylon cargo pants with multiple pockets, standing against a clean pure white seamless cyclorama studio background. The crisp white backdrop highlights the vibrant colors and technical details of the sportswear. The model displays the IDENTICAL FACE from the source image with matching facial structure and features, confident pose showing the outfit silhouette, soft studio lighting creating even illumination across the clothing, minimalist composition focusing entirely on the model and garments, contemporary athletic aesthetic, sharp detail on fabric textures and jacket sheen, professional color grading, commercial lookbook quality, face identity perfectly preserved from reference, white studio allowing the outfit colors to pop"

**Example 4 - Auto Mode (No Model Reference):**
"Streetwear fashion photograph of a young Korean female model with delicate features and long black hair, wearing a cropped black leather jacket over a white graphic tee and high-waisted cargo pants in olive green. The outfit has an urban edgy aesthetic, so the model has a confident, street-style presence. She stands against a clean pure white seamless cyclorama studio background that emphasizes the outfit details. Soft studio lighting with subtle shadows, medium full-body shot showing the complete look, contemporary street fashion aesthetic, sharp focus on fabric textures, professional color grading, editorial lookbook quality, the model's youthful energy matching the streetwear vibe"

## Key Guidelines

- **FACE CONSISTENCY IS TOP PRIORITY (Reference Mode)**: When model image is provided, the generated model MUST be the exact same person. Describe the face explicitly using phrases like "identical face to reference", "same person", "perfect facial feature preservation", "exact face match"
- **AUTO MODE (No Model Reference)**: When no model image is provided, analyze the outfit's vibe and describe an appropriate model type (demographics, features, energy) that naturally fits the clothing aesthetic
- ALWAYS accurately represent the outfit details from the reference images
- If location is provided, integrate it naturally; if NOT provided, use a clean white seamless studio background to keep focus on the outfit
- Use fashion photography vocabulary: "editorial", "campaign", "lookbook", "street style", "couture"
- Include lighting descriptors: "soft diffused", "golden hour", "dramatic contrast", "natural window light"
- Mention technical quality markers: "shot on [camera/lens]", "professional color grading", "8k resolution"
- Avoid: generic descriptions, inconsistent lighting scenarios, conflicting style references
- Focus on creating commercially viable, publication-ready fashion imagery

Now, analyze the provided images and craft an optimized prompt:`

// ============================================================================
// Google AI Logic
// ============================================================================

let geminiClient: GoogleGenAI | null = null

export function initializeGeminiAI(): boolean {
  if (geminiClient) return true
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Image generation will not work.')
    return false
  }
  try {
    geminiClient = new GoogleGenAI({ apiKey })
    return true
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error)
    return false
  }
}

function resolveAspectRatio(aspectRatio?: string): string {
  if (!aspectRatio) return '1:1'
  const normalized = aspectRatio.replace(/\s+/g, '').toLowerCase()
  return normalized || '1:1'
}

function resolveImageSize(resolution?: string): string | undefined {
  if (!resolution) return undefined
  if (['1K', '2K', '4K'].includes(resolution)) return resolution
  return undefined
}

function toDataUri(base64: string, mimeType: string): string {
  return base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const estimatedSize = Math.floor((match[2].length * 3) / 4)
        if (estimatedSize > MAX_REFERENCE_IMAGE_BYTES) return null
        return { mimeType: match[1], data: match[2] }
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const validation = validateImageUrl(url)
      if (!validation.valid) return null
    }
    const response = await fetch(url)
    if (!response.ok) return null
    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_REFERENCE_IMAGE_BYTES) return null
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) return null
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/png'
    return { data: base64, mimeType: contentType }
  } catch {
    return null
  }
}

function createPlaceholderImageResult(reason: string): GeminiGenerationResult {
  return {
    success: true,
    imageUrl: FALLBACK_PLACEHOLDER_IMAGE,
    imageUrls: [FALLBACK_PLACEHOLDER_IMAGE],
    warning: reason,
  }
}

export async function generateImageWithModel(
  prompt: string,
  modelId: string = DEFAULT_MODEL,
  options: {
    style?: string
    aspectRatio?: string
    width?: number
    height?: number
    imageUrls?: string[]
    numImages?: number
    outputFormat?: 'jpeg' | 'png'
    resolution?: '1K' | '2K' | '4K'
    isGenerateMode?: boolean
  } = {}
): Promise<GeminiGenerationResult> {
  if (!initializeGeminiAI() || !geminiClient) {
    return createPlaceholderImageResult('GEMINI_API_KEY not configured.')
  }

  try {
    const contents: any[] = [{ text: prompt }]
    if (options.imageUrls) {
      for (const url of options.imageUrls) {
        const img = await fetchImageAsBase64(url)
        if (img) contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
      }
    }

    const config: any = { responseModalities: ['IMAGE'] }
    config.imageConfig = {
      aspectRatio: resolveAspectRatio(options.aspectRatio),
    }
    if (modelId === 'gemini-3-pro-image-preview') {
      const size = resolveImageSize(options.resolution)
      if (size) config.imageConfig.imageSize = size
    }

    const response = await geminiClient.models.generateContent({
      model: modelId,
      contents,
      config,
    })

    const imageUrls: string[] = []
    const candidates = response.candidates || []
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || []
      for (const part of parts as any[]) {
        if (part.inlineData?.data) {
          imageUrls.push(toDataUri(part.inlineData.data, part.inlineData.mimeType))
        }
      }
    }

    if (imageUrls.length === 0) throw new Error('No images generated')

    return { success: true, imageUrl: imageUrls[0], imageUrls }
  } catch (error: any) {
    console.error('[GEMINI] Fail:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function generatePromptFromImages(options: {
  modelImageUrl?: string
  outfitImageUrls?: string[]
  locationImageUrl?: string
  userPrompt?: string
  isModelAutoMode?: boolean
  backgroundMode?: 'studio' | 'context' | 'upload'
}): Promise<string | null> {
  if (!initializeGeminiAI() || !geminiClient) return null
  const {
    modelImageUrl,
    outfitImageUrls = [],
    locationImageUrl,
    userPrompt,
    isModelAutoMode = false,
    backgroundMode = 'studio',
  } = options

  const templateLines = [
    'Input Template',
    `Model: ${
      modelImageUrl
        ? 'Use the provided reference image as the exact model identity.'
        : 'No model reference provided. Infer and describe a model face that fits the outfit vibe.'
    }`,
    'Outfit: Use the outfit reference images to extract styling and garment details.',
    `Location: ${
      locationImageUrl
        ? 'Use the location reference image for background and lighting.'
        : 'No location reference provided. If the user prompt specifies a background, follow it; otherwise default to a clean studio background.'
    }`,
    `UserPrompt: ${userPrompt?.trim() ? userPrompt.trim() : '(none)'}`,
  ]

  const contents: GeminiImagePart[] = [{ text: templateLines.join('\n') }]

  const addImagePart = async (url?: string) => {
    if (!url) return
    const img = await fetchImageAsBase64(url)
    if (!img) return
    contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
  }

  await addImagePart(modelImageUrl)
  for (const url of outfitImageUrls) {
    await addImagePart(url)
  }
  await addImagePart(locationImageUrl)

  try {
    const response = await geminiClient.models.generateContent({
      model: PROMPT_ENHANCE_MODEL,
      contents,
      config: {
        systemInstruction: PROMPT_SYSTEM_INSTRUCTION,
      },
    })

    const parts = response.candidates?.[0]?.content?.parts || []
    const prompt = parts
      .map((part: any) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim()

    return prompt.length > 0 ? prompt : null
  } catch (error) {
    console.error('[GEMINI] Prompt generation failed:', error)
    return null
  }
}

// ============================================================================
// Model Info & Legacy Compatibility
// ============================================================================

export function getModelInfo(modelId: string): GeminiModel | undefined {
  return GEMINI_MODELS.find(model => model.id === modelId)
}
