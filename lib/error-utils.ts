/**
 * Safely extracts an error message from any type of error
 * @param error The error to extract a message from
 * @returns A string representation of the error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Creates a standardized error response object
 * @param error The error to create a response from
 * @param additionalData Optional additional data to include in the response
 * @returns A standardized error response object
 */
export function createErrorResponse(error: unknown, additionalData: Record<string, any> = {}) {
  return {
    status: "error",
    message: getErrorMessage(error),
    timestamp: new Date().toISOString(),
    ...additionalData,
  }
}

