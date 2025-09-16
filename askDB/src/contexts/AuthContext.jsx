import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      // User is not authenticated or session expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await authAPI.login(email, password, rememberMe);
      const { user: userData } = response.data;
      
      // Update state (cookie is automatically set by the server)
      setUser(userData);
      
      return { 
        success: true, 
        user: userData,
        message: `Welcome back, ${userData.name || userData.email}!`
      };
    } catch (error) {
      let errorMessage = 'Login failed';
      
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        if (backendError === 'Invalid credentials') {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          errorMessage = backendError;
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser } = response.data;
      
      // Update state (cookie is automatically set by the server)
      setUser(newUser);
      
      return { 
        success: true, 
        user: newUser,
        message: `Welcome to AskDB, ${newUser.name}! Your account has been created successfully.`
      };
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        if (backendError === 'Email already registered') {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else if (backendError === 'Validation failed' && error.response.data.details) {
          // Handle specific validation errors from Zod
          const details = error.response.data.details;
          if (details.fieldErrors) {
            const fieldErrors = Object.values(details.fieldErrors).flat();
            errorMessage = fieldErrors.join('. ');
          } else {
            errorMessage = 'Please check your information and try again.';
          }
        } else if (backendError.includes('validation')) {
          errorMessage = 'Please check your information and try again.';
        } else {
          errorMessage = backendError;
        }
      } else if (error.response?.status === 409) {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Please check your information and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many registration attempts. Please wait a few minutes before trying again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side session
      await authAPI.logout();
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error);
    } finally {
      // Clear state
      setUser(null);
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
