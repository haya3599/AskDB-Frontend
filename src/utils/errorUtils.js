/**
 * Error Message Sanitization Utility
 * 
 * Converts technical error messages into user-friendly messages
 * while keeping sensitive information secure.
 */

/**
 * Sanitize error messages to be user-friendly
 * @param {string} errorMessage - Raw error message from backend
 * @param {string} context - Context where the error occurred
 * @returns {string} User-friendly error message
 */
export const sanitizeErrorMessage = (errorMessage, context = 'operation') => {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'An unexpected error occurred. Please try again.';
  }

  const message = errorMessage.toLowerCase();

  // Database-related errors
  if (message.includes('duplicate entry') && message.includes('unique_user_database_name')) {
    return 'A database with this name already exists. Please choose a different name.';
  }

  if (message.includes('duplicate entry') && message.includes('unique')) {
    return 'This item already exists. Please try with different information.';
  }

  if (message.includes('table') && message.includes("doesn't exist")) {
    return 'The requested table was not found. Please check your database structure.';
  }

  if (message.includes('unknown database')) {
    return 'The specified database was not found. Please check your database selection.';
  }

  if (message.includes('access denied')) {
    return 'Access denied. You do not have permission to perform this operation.';
  }

  if (message.includes('syntax error')) {
    return 'There is a syntax error in your SQL query. Please check and try again.';
  }

  if (message.includes('connection') && message.includes('refused')) {
    return 'Unable to connect to the database. Please check your connection settings.';
  }

  if (message.includes('timeout')) {
    return 'The operation timed out. Please try again with a smaller dataset.';
  }

  // File upload errors
  if (message.includes('file too large') || message.includes('limit_file_size')) {
    return 'The file is too large. Please choose a smaller file (max 10MB).';
  }

  if (message.includes('unsupported file type')) {
    return 'This file type is not supported. Please use CSV, Excel, JSON, TXT, or SQL files.';
  }

  if (message.includes('Only .sql and .db files are allowed')) {
    return 'Only .sql and .db files are allowed for database uploads.';
  }

  if (message.includes('failed to execute sql file')) {
    return 'There was an error processing your SQL file. Please check the file format and try again.';
  }

  // Authentication errors
  if (message.includes('invalid credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (message.includes('email already registered')) {
    return 'This email is already registered. Please use a different email or try logging in.';
  }

  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 'Please log in to continue.';
  }

  // Network errors
  if (message.includes('network error') || message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (message.includes('timeout') && message.includes('request')) {
    return 'Request timed out. Please try again.';
  }

  // Generic server errors
  if (message.includes('internal server error') || message.includes('500')) {
    return 'Server error. Please try again later.';
  }

  if (message.includes('bad request') || message.includes('400')) {
    return 'Invalid request. Please check your input and try again.';
  }

  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }

  if (message.includes('too many requests') || message.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // SQL-specific errors
  if (message.includes('create_database_from_file')) {
    return 'Failed to create database from file. Please check your file and try again.';
  }

  if (message.includes('execute sql')) {
    return 'Failed to execute SQL. Please check your query and try again.';
  }

  // If no specific pattern matches, return a generic message
  // but remove any technical details
  const genericMessage = errorMessage
    .replace(/key\s+['"][^'"]*['"]/gi, '') // Remove database keys
    .replace(/table\s+['"][^'"]*['"]/gi, 'table') // Remove table names
    .replace(/database\s+['"][^'"]*['"]/gi, 'database') // Remove database names
    .replace(/column\s+['"][^'"]*['"]/gi, 'column') // Remove column names
    .replace(/index\s+['"][^'"]*['"]/gi, 'index') // Remove index names
    .replace(/constraint\s+['"][^'"]*['"]/gi, 'constraint') // Remove constraint names
    .replace(/\b\w{8}-\w{4}-\w{4}-\w{4}-\w{12}\b/g, 'ID') // Remove UUIDs
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, 'date') // Remove dates
    .replace(/\b\d{2}:\d{2}:\d{2}\b/g, 'time') // Remove times
    .trim();

  // If the generic message is too technical, return a fallback
  if (genericMessage.length < 10 || genericMessage.includes('ER_') || genericMessage.includes('mysql')) {
    return `Failed to ${context}. Please try again.`;
  }

  return genericMessage;
};

/**
 * Extract user-friendly error message from API response
 * @param {Object} error - Error object from axios
 * @param {string} context - Context where the error occurred
 * @returns {string} User-friendly error message
 */
export const extractErrorMessage = (error, context = 'operation') => {
  // Check for different error response structures
  const errorMessage = 
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'An unexpected error occurred';

  return sanitizeErrorMessage(errorMessage, context);
};

/**
 * Log technical error details for debugging (only in development)
 * @param {Object} error - Error object
 * @param {string} context - Context where the error occurred
 */
export const logTechnicalError = (error, context = 'operation') => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`Technical Error in ${context}:`, {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      stack: error?.stack
    });
  }
};
