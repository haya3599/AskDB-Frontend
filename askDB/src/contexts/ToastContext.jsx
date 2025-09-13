import { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Error boundary for toast context
export const ToastErrorBoundary = ({ children, fallback = null }) => {
  try {
    return children;
  } catch (error) {
    console.error('Toast Error:', error);
    return fallback;
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const MAX_TOASTS = 5; // Prevent memory issues with too many toasts

  const addToast = (message, type = 'info', duration = 4000) => {
    // Input validation
    if (!message || typeof message !== 'string') {
      console.warn('Toast: Invalid message provided');
      return null;
    }
    
    if (!['success', 'error', 'warning', 'info'].includes(type)) {
      console.warn('Toast: Invalid type provided, defaulting to info');
      type = 'info';
    }
    
    if (typeof duration !== 'number' || duration < 0) {
      console.warn('Toast: Invalid duration provided, defaulting to 4000ms');
      duration = 4000;
    }
    
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => {
      const updated = [...prev, newToast];
      // Remove oldest toasts if we exceed the limit
      return updated.length > MAX_TOASTS ? updated.slice(-MAX_TOASTS) : updated;
    });
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message, duration) => addToast(message, 'success', duration);
  const error = (message, duration) => addToast(message, 'error', duration);
  const warning = (message, duration) => addToast(message, 'warning', duration);
  const info = (message, duration) => addToast(message, 'info', duration);

  const value = {
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render all toasts */}
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          index={index}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};
