/**
 * Standardized error handling utilities
 */

/**
 * Extract a user-friendly error message from an error object
 * @param {Error|Object} error - The error object
 * @param {string} fallbackMessage - Default message if extraction fails
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, fallbackMessage = 'An error occurred') => {
  // Handle axios errors
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  // Handle axios errors with message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Handle standard errors
  if (error?.message) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
};

/**
 * Log error to console in development only
 * @param {string} context - Where the error occurred
 * @param {Error|Object} error - The error object
 */
export const logError = (context, error) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
};
