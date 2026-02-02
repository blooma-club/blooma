'use client'

import { usePopupStore } from '@/store/popup'

interface ApiError {
  code?: string
  message?: string
  error?: {
    code?: string
    message?: string
  }
  status?: number
}

/**
 * Hook to handle credit-related errors from API responses
 * Automatically opens the appropriate popup when an InsufficientCreditsError is detected
 */
export function useHandleCreditError() {
  const openPopup = usePopupStore((state) => state.openPopup)

  /**
   * Check if an error is an InsufficientCreditsError and open the popup if so
   * @param error The error to check
   * @returns true if the error was an InsufficientCreditsError, false otherwise
   */
  const handleCreditError = (error: unknown): boolean => {
    // Check if it's a standardized API error response with INSUFFICIENT_CREDITS code
    if (error && typeof error === 'object') {
      const apiError = error as ApiError
      
      // Check for the correct structure: error.error.code === 'INSUFFICIENT_CREDITS'
      if (apiError.error?.code === 'INSUFFICIENT_CREDITS') {
        openPopup('notEnoughCredit')
        return true
      }
      
      // Also check for direct code property (fallback)
      if (apiError.code === 'INSUFFICIENT_CREDITS') {
        openPopup('notEnoughCredit')
        return true
      }
      
      // Check for specific error messages
      if (apiError.message === 'Insufficient credits' || apiError.message === 'Not enough credits') {
        openPopup('notEnoughCredit')
        return true
      }
      
      // Check for status 402 with INSUFFICIENT_CREDITS
      if ((apiError.status === 402 || (apiError as any).statusCode === 402) && 
          (apiError.error?.code === 'INSUFFICIENT_CREDITS' || apiError.code === 'INSUFFICIENT_CREDITS')) {
        openPopup('notEnoughCredit')
        return true
      }
    }
    
    return false
  }

  return { handleCreditError }
}
