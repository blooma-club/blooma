export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  prompt?: string;
  error?: string;
}

export interface PromptGenerationResult {
  success: boolean;
  generatedPrompt?: string;
  systemPrompt?: string;
  concept?: string;
  style?: string;
  genre?: string;
  model?: string;
  error?: string;
}

export async function generateImagePrompt(
  concept: string
): Promise<PromptGenerationResult> {
  try {
    const response = await fetch('/api/imagePromptGenerator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ concept }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image prompt');
    }

    const data = await response.json();
    return {
      success: true,
      generatedPrompt: data.generatedPrompt,
      systemPrompt: data.systemPrompt,
      concept: data.concept,
      style: data.style,
      genre: data.genre,
      model: data.model,
    };
  } catch (error) {
    console.error('Image prompt generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function generateStoryboardImage(prompt: string, useFluxPrompt: boolean = false): Promise<ImageGenerationResult> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, useFluxPrompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const data = await response.json();
    return {
      success: true,
      imageUrl: data.imageUrl,
      prompt: data.prompt,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Combined function that generates image prompt first, then generates image
export async function generateImageWithEnhancedPrompt(
  concept: string
): Promise<ImageGenerationResult & { aiPrompt?: string }> {
  try {
    // First, generate the image prompt
    const promptResult = await generateImagePrompt(concept);
    
    if (!promptResult.success || !promptResult.generatedPrompt) {
      return {
        success: false,
        error: promptResult.error || 'Failed to generate image prompt',
      };
    }

    // Then, generate the image using the enhanced prompt
    const imageResult = await generateStoryboardImage(promptResult.generatedPrompt, true);
    
    return {
      ...imageResult,
      aiPrompt: promptResult.generatedPrompt,
    };
  } catch (error) {
    console.error('Enhanced prompt image generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
