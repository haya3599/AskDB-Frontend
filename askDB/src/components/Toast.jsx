import { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Toast Notification Component
 * 
 * Displays temporary success, error, warning, or info messages
 * with smooth animations and auto-dismiss functionality.
 */
const Toast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose, 
  isVisible = true,
  index = 0
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Input validation
  const validMessage = typeof message === 'string' ? message : 'Invalid message';
  const validDuration = typeof duration === 'number' && duration > 0 ? duration : 4000;
  const validType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        const exitTimer = setTimeout(() => {
          onClose?.();
        }, 300); // Wait for exit animation
        
        return () => clearTimeout(exitTimer);
      }, validDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, validDuration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (validType) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  // Calculate stacking position
  const topPosition = 20 + (index * 80);

  return (
    <div 
      className={`toast toast-${validType} ${isAnimating ? 'toast-enter' : 'toast-exit'}`}
      style={{ top: `${topPosition}px` }}
    >
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <span className="toast-message">{validMessage}</span>
        <button 
          className="toast-close" 
          onClick={() => {
            setIsAnimating(false);
            setTimeout(() => onClose?.(), 300);
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
