// Create a custom fetch-based client for OpenRouter to avoid OpenAI SDK issues
type Message = { role: 'system' | 'user' | 'assistant'; content: string }
type ChatRequest = { model: string; messages: Message[]; temperature?: number; max_tokens?: number }

async function requestChat(params: ChatRequest) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Blooma AI Storyboard',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1200,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.error?.message || `HTTP ${response.status}`)
  }

  return await response.json()
}

export const openrouter = {
  chat: {
    completions: {
      create: (params: ChatRequest) => requestChat(params),
    },
  },
}


// Available models configuration
export const AVAILABLE_MODELS = {
  // OpenAI models
  'openai/gpt-5': {
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'Most advanced OpenAI model'
  },

  // Google Gemini models
  'google/gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Fast and efficient Gemini model'
  },

  // Anthropic Claude models
  'anthropic/claude-sonnet-4.5': {
    name: 'Claude 4.5',
    provider: 'Anthropic',
    description: 'Advanced Claude model for complex tasks'
  }
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;

