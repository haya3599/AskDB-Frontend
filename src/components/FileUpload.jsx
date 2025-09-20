import { useState, useRef, useEffect } from 'react';
import { sanitizeErrorMessage } from '../utils/errorUtils';

/**
 * FileUpload Component
 * 
 * Handles file upload functionality for the chat interface.
 * Supports drag & drop, file validation, and upload progress.
 */
const FileUpload = ({ onFileSelect, disabled = false, maxSize = 10 * 1024 * 1024, selectedFile = null }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);

  // Supported file types
  const supportedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'text/plain',
    'application/sql'
  ];

  const supportedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.txt', '.sql'];

  // Clear file input when selectedFile prop becomes null
  useEffect(() => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFile]);

  /**
   * Validate file before upload
   */
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB` 
      };
    }

    if (!supportedTypes.includes(file.type) && 
        !supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { 
        valid: false, 
        error: `Unsupported file type. Supported: ${supportedExtensions.join(', ')}` 
      };
    }

    return { valid: true };
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (file) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      const userFriendlyError = sanitizeErrorMessage(validation.error, 'file upload');
      alert(userFriendlyError);
      return;
    }

    onFileSelect(file);
  };

  /**
   * Handle drag and drop events with global document listeners
   */
  useEffect(() => {
    let dragTimeout = null;

    const handleGlobalDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleGlobalDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setDragCounter(prev => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setIsDragOver(true);
          }
          return newCount;
        });
        // Clear any existing timeout
        if (dragTimeout) {
          clearTimeout(dragTimeout);
          dragTimeout = null;
        }
      }
    };

    const handleGlobalDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setDragCounter(prev => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            // Add a small delay to prevent flickering
            dragTimeout = setTimeout(() => {
              setIsDragOver(false);
              setDragCounter(0);
            }, 100);
          }
          return newCount;
        });
      }
    };

    const handleGlobalDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }
      
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    };

    // Handle drag end (when user cancels drag by releasing outside browser)
    const handleGlobalDragEnd = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }
    };

    // Handle window focus/blur to detect when drag goes outside browser
    const handleWindowBlur = () => {
      setIsDragOver(false);
      setDragCounter(0);
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }
    };

    // Handle mouse up anywhere to clear drag state
    const handleMouseUp = () => {
      // Only clear if we're currently in drag state
      if (isDragOver) {
        // Small delay to allow dragend to fire first
        setTimeout(() => {
          setIsDragOver(false);
          setDragCounter(0);
          if (dragTimeout) {
            clearTimeout(dragTimeout);
            dragTimeout = null;
          }
        }, 50);
      }
    };

    // Add global event listeners
    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleWindowBlur);
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [disabled, dragCounter]);

  /**
   * Handle drag and drop events for the upload button
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Clear selected file
   */
  const clearFile = () => {
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null);
  };

  /**
   * Trigger file input
   */
  const triggerFileInput = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      {/* Full-screen drag overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-icon">📁</div>
            <h2 className="drag-title">Drop your file here</h2>
            <p className="drag-subtitle">
              Supported formats: CSV, Excel, JSON, TXT, SQL
            </p>
            <div className="drag-hint">
              Release to upload
            </div>
          </div>
        </div>
      )}

      <div className="file-upload-container">
        <div
          className={`file-upload-icon ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          title={selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'Upload file (csv,xlsx,xls,json,txt,sql)'}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={supportedExtensions.join(',')}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />
          
          {selectedFile ? (
            <div className="file-icon-selected">
              <span className="file-icon-small">📄</span>
              <button
                type="button"
                className="file-remove-btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                disabled={disabled}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="upload-icon-small">📁</span>
          )}
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="upload-progress-small">
            <div className="progress-bar-small">
              <div 
                className="progress-fill-small" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FileUpload;
