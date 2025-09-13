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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response.data;
      
      // Store in localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
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
      const { token: newToken, user: newUser } = response.data;
      
      // Store in localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Update state
      setToken(newToken);
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

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear state
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
