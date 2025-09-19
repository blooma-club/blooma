import OpenAI from 'openai';

export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: false, // Keep API calls server-side
});

// Centralized default LLM model for OpenRouter
export const DEFAULT_LLM_MODEL = 'openai/gpt-5';

