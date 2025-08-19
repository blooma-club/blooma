import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

export async function POST(request: NextRequest) {
  try {
    // Ensure FAL key configured
    if (!process.env.FAL_KEY) {
      console.error('FAL_KEY is not set');
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 });
    }

    const { prompt, useFluxPrompt = false } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Configure FAL client
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    // Decide which prompt to use based on the image style
    const finalPrompt = useFluxPrompt 
      ? prompt 
      : `enhance the prompt ${prompt} to be more detailed`;

    // Log only the final prompt used for image generation
    console.log('Final Prompt:', finalPrompt);
    
    // Call FAL flux schnell model
    // Reference: https://fal.ai/models/fal-ai/flux/schnell
    const submission: unknown = await fal.subscribe('fal-ai/flux/schnell', {
      input: { prompt: finalPrompt }
    });
    type FalMaybeImage = { url?: string } | undefined
    // Narrow unknown
    const s = submission as Record<string, any> | null
    const imageUrl = (s?.images?.[0] as FalMaybeImage)?.url ||
      (s?.output?.[0] as FalMaybeImage)?.url ||
      (s?.image as FalMaybeImage)?.url ||
      (s?.data?.[0] as FalMaybeImage)?.url;
    if (!imageUrl) throw new Error('No image generated');

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      prompt: finalPrompt
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate image';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
