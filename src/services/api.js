import axios from 'axios';

/**
 * API Service Configuration
 * 
 * Centralized HTTP client configuration for AskDB frontend.
 * Handles authentication, error handling, and request/response interceptors.
 */

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor - cookies are automatically included with withCredentials: true
api.interceptors.request.use(
  (config) => {
    // No need to manually attach tokens - cookies are handled automatically
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle authentication errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login page on unauthorized access (avoid redirect loops)
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API Service
 * 
 * Handles user authentication including login, registration,
 * and user profile management.
 */
export const authAPI = {
  /**
   * Authenticate user with email and password
   * 
   * @param {string} email - User email address
   * @param {string} password - User password
   * @param {boolean} rememberMe - Whether to remember the user for 30 days
   * @returns {Promise} Axios response with user data
   */
  login: (email, password, rememberMe = false) => 
    api.post('/users/login', { email, password, rememberMe }),
  
  /**
   * Register a new user account
   * 
   * @param {Object} userData - User registration data
   * @returns {Promise} Axios response with user data
   */
  register: (userData) => 
    api.post('/users/register', userData),
  
  /**
   * Get current user profile information
   * 
   * @returns {Promise} Axios response with user profile
   */
  getMe: () => 
    api.get('/users/me'),
  
  updateMe: (userData) => 
    api.put('/users/me', userData),
  
  /**
   * Logout user and clear session
   * 
   * @returns {Promise} Axios response with logout confirmation
   */
  logout: () => 
    api.post('/users/logout'),
};

/**
 * Chat API Service
 * 
 * Handles all chat-related API calls including message sending,
 * conversation management, and history retrieval.
 */
export const chatAPI = {
  /**
   * Send a message to the AI chat system
   * 
   * @param {string} message - User message content
   * @param {File|null} file - Optional file upload
   * @param {string|null} conversationId - Optional conversation ID for context
   * @returns {Promise} Axios response with AI response data
   */
  sendMessage: (message, file = null, conversationId = null, databaseId = null) => {
    const formData = new FormData();
    formData.append('message', message);
    if (file) {
      formData.append('file', file);
    }
    // Append conversation_id to distinguish new vs existing conversations
    formData.append('conversation_id', conversationId || '');
    if (databaseId) {
      formData.append('database_id', databaseId);
    }
    return api.post('/chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  /**
   * Retrieve user's conversation list
   * 
   * @returns {Promise} Axios response with conversations array
   */
  getConversations: () => 
    api.get('/chat/conversations'),
  
  /**
   * Get conversation history for a specific conversation
   * 
   * @param {string} conversationId - ID of the conversation
   * @returns {Promise} Axios response with message history
   */
  getConversationHistory: (conversationId) => 
    api.get(`/chat/history/${conversationId}`),
  
  /**
   * Delete a conversation
   * 
   * @param {string} conversationId - ID of the conversation to delete
   * @returns {Promise} Axios response with deletion confirmation
   */
  deleteConversation: (conversationId) => 
    api.delete(`/chat/conversations/${conversationId}`),
  
  /**
   * Confirm and execute a pending SQL operation
   * 
   * @param {string} messageId - ID of the pending operation
   * @param {string} sql - SQL query to execute (may be modified)
   * @returns {Promise} Axios response with execution results
   */
  confirmSQL: (messageId, sql) => 
    api.post('/chat/confirm-sql', { messageId, sql }),
};

/**
 * Databases API Service
 *
 * Fetches the current user's databases for selection.
 */
export const databasesAPI = {
  /**
   * Get user's databases
   * @returns {Promise} Axios response with databases array
   */
  getAll: () => api.get('/databases'),
  /**
   * Get schema for a specific database
   * @param {string} id
   */
  getSchema: (id) => api.get(`/databases/${id}/schema`),
  /**
   * Export database as SQL dump (.sql)
   */
  export: (id, format = 'sql') => api.get(`/databases/${id}/export?format=${format}`, { responseType: 'blob' }),
};

/**
 * Health Check API Service
 * 
 * Provides system health monitoring and connection testing utilities.
 */
export const healthAPI = {
  /**
   * Check backend server health status
   * 
   * @returns {Promise} Axios response with health status
   */
  check: () => 
    api.get('/health'),
};

/**
 * Test backend connection utility
 * 
 * @returns {Promise<Object>} Connection test result with success/error status
 */
export const testConnection = async () => {
  try {
    const response = await healthAPI.check();
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Connection failed' 
    };
  }
};

export default api;
