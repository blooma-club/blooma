# Google Gemini AI Integration Setup

This guide explains how to set up Google Gemini AI for script generation in Blooma.

## Overview

Blooma now supports Google Gemini AI for script generation as the primary AI provider, with OpenRouter as a fallback. Gemini provides faster response times and optimized creative writing capabilities for storyboard scripts.

## Setup Instructions

### 1. Get Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on "Get API key"
4. Create a new API key or use an existing one
5. Copy your API key

### 2. Configure Environment Variables

Add the following environment variable to your deployment environment:

```bash
# Google Gemini AI API Key (Primary)
GEMINI_API_KEY=your_gemini_api_key_here

# Alternative environment variable name (also supported)
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Keep OpenRouter as fallback
OPENROUTER_API_KEY=your_openrouter_key_here
```

**Note**: You only need one of `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`. The system will check for both.

### 3. Deploy and Test

1. Deploy your application with the new environment variables
2. Go to the project setup page
3. In the Optional Settings panel, you'll see "AI Model for Script Generation"
4. Choose between:
   - **Google Gemini 2.0 Flash** (Default, recommended)
   - **OpenRouter GPT-5** (Fallback)

## Features

### AI Model Selection

- Users can choose their preferred AI model in the Optional Settings panel
- Gemini is set as the default for optimal performance
- Automatic fallback to OpenRouter if Gemini fails or is unavailable

### Supported Gemini Models

- **Gemini 2.0 Flash (Experimental)**: Latest model with fastest response times
- **Gemini 1.5 Flash**: Fast and efficient for quick generation
- **Gemini 1.5 Pro**: Most capable for complex reasoning and creative writing

### Error Handling

- Automatic fallback to OpenRouter if Gemini is unavailable
- Specific error messages for common issues:
  - Invalid API key
  - Quota exceeded
  - Content safety violations
  - Recitation/copyright concerns

## Configuration Options

The Gemini integration supports several configuration options:

```typescript
{
  temperature: 0.7,        // Creativity level (0-1)
  maxTokens: 1200,         // Maximum response length
  systemInstruction: "...", // Custom system prompt
}
```

## API Usage

The script generation API now accepts a `useGemini` parameter:

```javascript
const response = await fetch('/api/script/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'your-project-id',
    userScript: 'Your script content...',
    settings: {
      intent: 'Commercial',
      genre: 'Cinematic',
      // ... other settings
      aiModel: 'gemini', // or 'openrouter'
    },
    useGemini: true, // Automatically set based on aiModel
  }),
})
```

## Troubleshooting

### Gemini API Not Working

1. Verify your `GEMINI_API_KEY` is correct
2. Check that you have available quota in Google AI Studio
3. Ensure your API key has the necessary permissions

### Fallback to OpenRouter

If Gemini fails, the system automatically falls back to OpenRouter. Check the response metadata to see which provider was used:

```json
{
  "script": "Generated script content...",
  "meta": {
    "provider": "gemini", // or "openrouter"
    "model": "gemini-2.0-flash-exp",
    "elapsedTime": 1500
  }
}
```

### Content Safety Issues

If your content is blocked by Gemini's safety filters:

1. Review your input for potentially harmful content
2. Modify your script or settings
3. The system will automatically try OpenRouter as fallback

## Benefits of Gemini Integration

- **Faster Response Times**: Gemini 2.0 Flash provides rapid script generation
- **Better Creative Writing**: Optimized for storytelling and narrative content
- **Cost Efficiency**: Competitive pricing compared to other models
- **Reliability**: Automatic fallback ensures script generation always works
- **Flexibility**: Users can choose their preferred AI provider

## Support

If you encounter issues with the Gemini integration:

1. Check the browser console for detailed error messages
2. Verify environment variables are properly set
3. Test with OpenRouter fallback to isolate Gemini-specific issues
4. Review the API response metadata for debugging information
