/**
 * Basic tests for Gemini AI integration
 * Note: These tests require a valid GEMINI_API_KEY environment variable
 */

import { validateGeminiConfig, getGeminiModelInfo, getAvailableGeminiModels, createGeminiSystemPrompt } from '../gemini'

describe('Gemini Integration', () => {
  describe('Configuration Validation', () => {
    it('should validate Gemini configuration', () => {
      const result = validateGeminiConfig()
      // This will depend on whether GEMINI_API_KEY is set in test environment
      expect(result).toHaveProperty('isValid')
      expect(typeof result.isValid).toBe('boolean')
    })
  })

  describe('Model Information', () => {
    it('should return model information for valid model ID', () => {
      const model = getGeminiModelInfo('gemini-2.0-flash-exp')
      expect(model).toBeDefined()
      expect(model?.name).toBe('Gemini 2.0 Flash (Experimental)')
      expect(model?.cost).toBe('low')
    })

    it('should return undefined for invalid model ID', () => {
      const model = getGeminiModelInfo('invalid-model' as any)
      expect(model).toBeUndefined()
    })

    it('should return list of available models', () => {
      const models = getAvailableGeminiModels()
      expect(Array.isArray(models)).toBe(true)
      expect(models.length).toBeGreaterThan(0)
      expect(models[0]).toHaveProperty('id')
      expect(models[0]).toHaveProperty('name')
    })
  })

  describe('System Prompt Generation', () => {
    it('should create system prompt with default language', () => {
      const prompt = createGeminiSystemPrompt()
      expect(prompt).toContain('English')
      expect(prompt).toContain('storyboard writer')
      expect(prompt).toContain('Shot Description')
    })

    it('should create system prompt with custom language', () => {
      const prompt = createGeminiSystemPrompt('Spanish')
      expect(prompt).toContain('Spanish')
      expect(prompt).toContain('storyboard writer')
    })

    it('should include required markdown format', () => {
      const prompt = createGeminiSystemPrompt()
      expect(prompt).toContain('# Storyboard')
      expect(prompt).toContain('## Summary')
      expect(prompt).toContain('## Shot')
      expect(prompt).toContain('Shot #:')
      expect(prompt).toContain('Camera Shot:')
      expect(prompt).toContain('Dialogue / VO:')
    })
  })
})

// Integration test that requires API key (skip if not available)
describe('Gemini API Integration', () => {
  beforeEach(() => {
    const config = validateGeminiConfig()
    if (!config.isValid) {
      console.warn('Skipping Gemini API tests - GEMINI_API_KEY not configured')
    }
  })

  it('should handle API configuration check', () => {
    const config = validateGeminiConfig()
    if (config.isValid) {
      expect(config.error).toBeUndefined()
    } else {
      expect(config.error).toBeDefined()
      expect(typeof config.error).toBe('string')
    }
  })
})
