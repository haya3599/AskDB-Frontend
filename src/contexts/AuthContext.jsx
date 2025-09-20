import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { extractErrorMessage, logTechnicalError } from '../utils/errorUtils';

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
      logTechnicalError(error, 'login');
      const errorMessage = extractErrorMessage(error, 'login');
      
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
      logTechnicalError(error, 'registration');
      const errorMessage = extractErrorMessage(error, 'registration');
      
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
