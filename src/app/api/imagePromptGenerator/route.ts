import { NextRequest, NextResponse } from 'next/server';
import { openrouter, SYSTEM_PROMPTS } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const { userPrompt, imageStyle = 'realistic' } = await request.json();

      if (!userPrompt) {
      return NextResponse.json(
        { error: 'User prompt is required' },
        { status: 400 }
      );
    }


    console.log('Making OpenRouter API call with model');
    console.log('User prompt:', userPrompt);
    
    const completion = await openrouter.chat.completions.create({
      model: "openai/gpt-oss-20b:free",
      messages: [
        { 
          role: 'system', 
          content: SYSTEM_PROMPTS[imageStyle as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.realistic
        },
        { 
          role: 'user', 
          content: `Enhance this image prompt for AI image generation: "${userPrompt}"` 
        }
      ],
    });


    const generatedPrompt = completion.choices[0]?.message?.content;

    if (!generatedPrompt) {
      throw new Error('No prompt generated from OpenRouter API');
    }

    // Log only the final generated prompt
    console.log('Generated Prompt:', generatedPrompt);

    return NextResponse.json({
      success: true,
      generatedPrompt,
    });

  } catch (error) {
    console.error('Image prompt generation error:', error);
    
    // Handle OpenRouter API errors specifically
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if it's an OpenRouter API error
      if (error.message.includes('400') || error.message.includes('Provider returned error')) {
        statusCode = 400;
        errorMessage = 'OpenRouter API error: Invalid request or provider issue. Please check your API key and try again.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401;
        errorMessage = 'OpenRouter API error: Unauthorized. Please check your API key.';
      } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
        statusCode = 429;
        errorMessage = 'OpenRouter API error: Rate limit exceeded. Please try again later.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
