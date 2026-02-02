import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { DbConfigurationError, DbQueryError } from '@/lib/db/db'
import { InsufficientCreditsError } from '@/lib/billing/credits'
import { ApiError, ErrorCodes, StandardApiResponse } from './types'

const isProduction = process.env.NODE_ENV === 'production'

type ErrorHandlerOptions = {
    context?: string
    requestId?: string
    includeStackTrace?: boolean
}

function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function createApiResponse<T>(
    data?: T,
    options?: { requestId?: string }
): NextResponse<StandardApiResponse<T>> {
    return NextResponse.json({
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...(options?.requestId && { requestId: options.requestId }),
        },
    })
}

export function createErrorResponse(
    error: ApiError | Error,
    options?: ErrorHandlerOptions
): NextResponse<StandardApiResponse> {
    const isApiError = error instanceof ApiError
    const statusCode = isApiError ? error.statusCode : 500
    const code = isApiError ? error.code || ErrorCodes.INTERNAL_ERROR : ErrorCodes.INTERNAL_ERROR
    const message = error.message || 'An unexpected error occurred'

    const errorDetails =
        isApiError && error.details && typeof error.details === 'object' && error.details !== null
            ? error.details
            : undefined

    const response: StandardApiResponse = {
        success: false,
        error: {
            code,
            message,
            ...(errorDetails && { details: errorDetails }),
            ...(options?.includeStackTrace && process.env.NODE_ENV === 'development' && {
                stack: error.stack,
            }),
        },
        meta: {
            timestamp: new Date().toISOString(),
            ...(options?.requestId && { requestId: options.requestId }),
        },
    }

    return NextResponse.json(response, { status: statusCode })
}

export function createErrorHandler(
    context?: string,
    options?: Omit<ErrorHandlerOptions, 'context'>
): (error: unknown) => NextResponse<StandardApiResponse> {
    return (error: unknown): NextResponse<StandardApiResponse> => {
        const requestId = options?.requestId || generateRequestId()

        if (error instanceof ZodError) {
            const zodIssues = error.issues || []
            const issues =
                zodIssues.length > 0
                    ? zodIssues.map((err) => ({
                        path: Array.isArray(err.path) ? err.path.map(String).join('.') : String(err.path || ''),
                        message: err.message || 'Validation error',
                    }))
                    : [{ path: '', message: 'Validation failed' }]

            const apiErr = ApiError.unprocessableEntity('Validation failed', { issues })
            if (context) console.error(`[${context}] Validation error:`, zodIssues)
            return createErrorResponse(apiErr, { context, requestId, ...options })
        }

        if (error instanceof InsufficientCreditsError) {
            const creditErr = new ApiError(402, 'Not enough credits', 'INSUFFICIENT_CREDITS')
            if (context) console.error(`[${context}] Insufficient credits error`)
            return createErrorResponse(creditErr, { context, requestId, ...options })
        }

        if (error instanceof ApiError) {
            if (context) {
                console.error(`[${context}] API Error:`, {
                    code: error.code,
                    message: error.message,
                    statusCode: error.statusCode,
                    details: error.details,
                })
            }
            return createErrorResponse(error, { context, requestId, ...options })
        }

        if (error instanceof DbConfigurationError) {
            if (context) console.error(`[${context}] Database configuration error:`, error)
            const dbErr = ApiError.internal(
                isProduction ? 'Database error' : 'Database configuration error'
            )
            return createErrorResponse(dbErr, { context, requestId, ...options })
        }

        if (error instanceof DbQueryError) {
            if (context) {
                console.error(`[${context}] Database query failed:`, {
                    message: error.message,
                    details: error.details,
                })
            }
            const queryErr = ApiError.internal(isProduction ? 'Database error' : 'Database query failed')
            return createErrorResponse(queryErr, { context, requestId, ...options })
        }

        if (error instanceof Error) {
            if (context) {
                console.error(`[${context}] Unexpected error:`, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                })
            }
            const generalErr = ApiError.internal(isProduction ? 'An error occurred' : error.message)
            return createErrorResponse(generalErr, { context, requestId, ...options })
        }

        if (context) console.error(`[${context}] Unknown error:`, error)
        const unknownErr = ApiError.internal('An error occurred')
        return createErrorResponse(unknownErr, { context, requestId, ...options })
    }
}

export async function requireAuth(): Promise<{ userId: string }> {
    // Dynamic import to avoid circular dependencies
    const { getSupabaseUserAndSync } = await import('@/lib/db/supabase-server')

    const user = await getSupabaseUserAndSync()
    if (!user) throw ApiError.unauthorized()
    return { userId: user.id }
}

export function requireUserId(userId: string | null | undefined): string {
    if (!userId) throw ApiError.unauthorized()
    return userId
}
