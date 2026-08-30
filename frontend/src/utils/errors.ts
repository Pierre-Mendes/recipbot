import type { ApiValidationError } from '@/types'

export function extractValidationErrors(error: unknown): Record<string, string[]> {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number; data?: unknown } }).response?.status === 'number'
  ) {
    const response = (error as { response: { status: number; data?: ApiValidationError } }).response
    if (response.status === 422 && response.data && typeof response.data === 'object') {
      return response.data.errors ?? {}
    }
  }

  return {}
}

export function firstValidationMessage(errors: Record<string, string[]>, field: string): string | null {
  const value = errors[field]
  if (!value || value.length === 0) {
    return null
  }

  return value[0]
}
