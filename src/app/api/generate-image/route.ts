import { NextRequest, NextResponse } from 'next/server';
import Together from "together-ai";

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.TOGETHER_API_KEY) {
      console.error('TOGETHER_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const { prompt, useFluxPrompt = false } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize Together client
    const together = new Together();

    // Decide which prompt to use based on the image style
    const finalPrompt = useFluxPrompt 
      ? prompt 
      : `enhance the prompt ${prompt} to be more detailed`;

    // Log only the final prompt used for image generation
    console.log('Final Prompt:', finalPrompt);
    
    const response = await together.images.create({
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: finalPrompt
    });

    if (!response.data || !response.data[0]) {
      throw new Error('No image generated');
    }

    // Get the image data - handle different response formats
    const imageData = response.data[0];
    let imageUrl = '';
    
    if ('b64_json' in imageData && imageData.b64_json) {
      // Base64 format
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else if ('url' in imageData && imageData.url) {
      // URL format
      imageUrl = imageData.url;
    } else {
      console.error('Available keys in imageData:', Object.keys(imageData));
      throw new Error('No valid image data received. Available keys: ' + Object.keys(imageData).join(', '));
    }

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
