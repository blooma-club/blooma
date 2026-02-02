import type { ImageGenerationValidated } from '@/lib/validation'
import { generatePromptFromImages } from '@/lib/google-ai/client'

export type PreparedGenerationPrompt = {
  effectiveModelId: string
  promptForModel: string
  aspectRatioForModel: string | undefined
  modelOverrideWarning: string | undefined
}

export async function preparePromptForGeneration(options: {
  validated: ImageGenerationValidated
  requestedModelId: string
  modelImageUrl: string | undefined
  outfitImageUrls: string[]
  locationImageUrl: string | undefined
}): Promise<PreparedGenerationPrompt> {
  const { validated, requestedModelId, modelImageUrl, outfitImageUrls, locationImageUrl } = options

  const effectiveModelId = requestedModelId
  const modelOverrideWarning: string | undefined = undefined

  let promptForModel = validated.prompt ?? ''
  let aspectRatioForModel = validated.aspectRatio

  const inpaintEnabled = validated.inpaint === true
  const defaultInpaintPrompt =
    'Place the model into the background. Preserve the background, lighting, and outfit details.'

  if (validated.shotSize) {
    const shotSizeMap: Record<string, string> = {
      'extreme-close-up': 'Extreme Close Up Shot',
      'close-up': 'Close Up Shot',
      'medium-shot': 'Medium Shot',
      'full-body': 'Full Body Shot',
    }
    const shotText = shotSizeMap[validated.shotSize] || ''
    if (shotText) {
      promptForModel = `${promptForModel ? promptForModel + ', ' : ''}${shotText}`
    }
  }

  const editModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
  if (editModels.includes(effectiveModelId)) {
    const desiredAspectRatio = validated.aspectRatio || '3:4'
    aspectRatioForModel = desiredAspectRatio

    if (!inpaintEnabled) {
      const llmGeneratedPrompt = await generatePromptFromImages({
        modelImageUrl: validated.isModelAutoMode ? undefined : modelImageUrl,
        outfitImageUrls,
        locationImageUrl,
        userPrompt: validated.prompt,
        isModelAutoMode: validated.isModelAutoMode,
        backgroundMode: validated.backgroundMode,
      })

      if (llmGeneratedPrompt) {
        promptForModel = llmGeneratedPrompt
        console.log('[API] Using LLM-generated JSON prompt.')
        console.log('[API] JSON prompt length:', llmGeneratedPrompt.length)
      } else {
        promptForModel = validated.prompt?.trim() || ''
        console.log('[API] LLM prompt generation failed, using raw user prompt.')
      }
      console.log('[API] Prompt for model:', promptForModel?.substring(0, 200) + '...')
    }
  }

  if (inpaintEnabled && (!promptForModel || !promptForModel.trim())) {
    promptForModel = defaultInpaintPrompt
  }

  return {
    effectiveModelId,
    promptForModel,
    aspectRatioForModel,
    modelOverrideWarning,
  }
}

