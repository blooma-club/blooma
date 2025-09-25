import { uploadCharacterImageToR2 } from '../r2'

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn()
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com')
}))

// Mock environment variables
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_ACCOUNT_ID: 'test-account'
  }
})

afterAll(() => {
  process.env = originalEnv
})

// Mock fetch for URL downloads
global.fetch = jest.fn()

describe('uploadCharacterImageToR2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upload data URL correctly', async () => {
    const characterId = 'char-test-123'
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    
    const result = await uploadCharacterImageToR2(characterId, dataUrl)
    
    expect(result).toEqual({
      publicUrl: expect.stringContaining('characters/'),
      key: expect.stringMatching(/^characters\/char-test-123_\d+\.png$/),
      signedUrl: 'https://signed-url.example.com',
      contentType: 'image/png',
      size: expect.any(Number)
    })
  })

  it('should upload with project ID organization', async () => {
    const characterId = 'char-test-456'
    const projectId = 'project-789'
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAAABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMEAQMDAgQHBwcEAQACEQMEIRIxBQVBUWEGEyJxgZEyobHwFMHR4SNCYnKCkqOywhPwJENzntP/xAL8QAAGAQIGAgMBAAAAAAAAAAAAAAECAwQFBgcIETESITNBUWFxgZGhwdHw4SIj/aAAwDAQACEQMRAD8A+/4qSiEoptJQ//Z'
    
    const result = await uploadCharacterImageToR2(characterId, dataUrl, projectId)
    
    expect(result.key).toMatch(/^characters\/project-789\/char-test-456_\d+\.jpg$/)
    expect(result.publicUrl).toContain('characters/project-789/')
  })

  it('should handle external URL downloads', async () => {
    const characterId = 'char-test-789'
    const imageUrl = 'https://example.com/character.png'
    
    // Mock successful fetch
    const mockArrayBuffer = new ArrayBuffer(1024)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('image/png')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    })
    
    const result = await uploadCharacterImageToR2(characterId, imageUrl)
    
    expect(global.fetch).toHaveBeenCalledWith(imageUrl, {
      signal: expect.any(AbortSignal),
      headers: {
        'User-Agent': 'Blooma/1.0'
      }
    })
    
    expect(result.key).toMatch(/^characters\/char-test-789_\d+\.png$/)
  })

  it('should throw error for invalid data URL', async () => {
    const characterId = 'char-test-invalid'
    const invalidDataUrl = 'invalid-data-url'
    
    await expect(uploadCharacterImageToR2(characterId, invalidDataUrl))
      .rejects.toThrow('Invalid data URL')
  })

  it('should retry on 409 errors', async () => {
    const characterId = 'char-test-retry'
    const imageUrl = 'https://example.com/character.png'
    
    // Mock 409 error on first attempt, success on second
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to download character image: 409 Conflict'))
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('image/png')
        },
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      })
    
    // Should eventually succeed after retry
    const result = await uploadCharacterImageToR2(characterId, imageUrl)
    expect(result.key).toMatch(/^characters\/char-test-retry_\d+\.png$/)
  })
})
