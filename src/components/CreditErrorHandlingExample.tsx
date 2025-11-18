'use client'

import React, { useState } from 'react'
import { useHandleCreditError } from '@/hooks/useHandleCreditError'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

/**
 * Example component demonstrating how to handle credit errors in API calls
 * This component shows how to use the useHandleCreditError hook to automatically
 * show the "Not Enough Credits" popup when an InsufficientCreditsError occurs
 */
export function CreditErrorHandlingExample() {
  const { handleCreditError } = useHandleCreditError()
  const { push: showToast } = useToast()
  const [loading, setLoading] = useState(false)

  /**
   * Example function that simulates an API call that might fail due to insufficient credits
   */
  const handleGenerateImage = async () => {
    setLoading(true)
    try {
      // Simulate an API call to generate an image
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A beautiful landscape',
          modelId: 'fal-ai/gemini-25-flash-image',
        }),
      })

      const data = await response.json()

      // Check if the response indicates insufficient credits
      if (!response.ok) {
        // Try to handle credit errors - if it returns true, a popup was shown
        if (handleCreditError(data)) {
          return // Popup was shown, no need to show additional error
        }

        // Handle other errors
        throw new Error(data.error || 'Failed to generate image')
      }

      // Success case
      showToast({
        title: 'Success',
        description: 'Image generated successfully!',
      })
    } catch (error) {
      // Try to handle credit errors - if it returns true, a popup was shown
      if (handleCreditError(error)) {
        return // Popup was shown, no need to show additional error
      }

      // Handle other errors
      const message = error instanceof Error ? error.message : 'An unknown error occurred'
      showToast({
        title: 'Error',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Credit Error Handling Example</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This component demonstrates how to handle credit errors in API calls. When you click the
        button below, it will simulate an API call that might fail due to insufficient credits.
      </p>
      <Button onClick={handleGenerateImage} disabled={loading} variant="default">
        {loading ? 'Generating...' : 'Generate Image (Costs Credits)'}
      </Button>
    </div>
  )
}
