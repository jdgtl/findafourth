import { useCallback } from 'react';
import { toast } from 'sonner';
import { getErrorMessage, logError } from '@/lib/errors';

/**
 * Hook for consistent error handling with toast notifications
 * @returns {Object} Error handling utilities
 */
export const useErrorHandler = () => {
  /**
   * Handle an error with toast notification
   * @param {Error|Object} error - The error object
   * @param {string} context - Where the error occurred (for logging)
   * @param {string} fallbackMessage - Default user message
   */
  const handleError = useCallback((error, context, fallbackMessage = 'An error occurred') => {
    logError(context, error);
    const message = getErrorMessage(error, fallbackMessage);
    toast.error(message);
  }, []);

  /**
   * Create an async handler with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Error context
   * @param {string} fallbackMessage - Default error message
   * @returns {Function} Wrapped function
   */
  const withErrorHandling = useCallback((fn, context, fallbackMessage) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context, fallbackMessage);
        throw error; // Re-throw if caller needs to handle
      }
    };
  }, [handleError]);

  return {
    handleError,
    withErrorHandling,
  };
};

export default useErrorHandler;
