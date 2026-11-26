import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a human-readable error message from backend HTTP responses or exceptions.
 */
export function extractAdminErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach CeylonGo backend service. Please check your network connection.';
    }
    if (error.status === 401) {
      return 'Your administrative session has expired. Please sign in again.';
    }
    if (error.status === 403) {
      return 'You do not have administrative authorization to perform this action.';
    }
    if (error.status === 404) {
      return typeof error.error?.detail === 'string'
        ? error.error.detail
        : 'The requested record was not found.';
    }
    if (error.status === 409) {
      return typeof error.error?.detail === 'string'
        ? error.error.detail
        : 'The record was modified concurrently by another administrator. Please refresh.';
    }
    if (error.status === 422) {
      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }
      if (Array.isArray(error.error?.detail) && error.error.detail.length > 0) {
        const first = error.error.detail[0];
        return first.msg ? `${first.loc?.join('.') || 'Field'}: ${first.msg}` : 'Validation error.';
      }
      return 'Input validation failed. Please check the supplied values.';
    }
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Checks whether an HTTP error is an optimistic concurrency conflict (HTTP 409).
 */
export function isConcurrencyConflictError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}
