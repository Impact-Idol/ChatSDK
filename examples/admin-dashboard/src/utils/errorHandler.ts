// Error handling utilities

export interface ApiError {
  message: string;
  status: number;
}

export function handleApiError(error: any): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function showError(message: string) {
  // For now, use alert. Can be replaced with a toast library later
  alert(`Error: ${message}`);
}

export function showSuccess(message: string) {
  // For now, use alert. Can be replaced with a toast library later
  alert(message);
}
