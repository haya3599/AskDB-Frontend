import { useState, useRef } from 'react';

/**
 * FileUpload Component
 * 
 * Handles file upload functionality for the chat interface.
 * Supports drag & drop, file validation, and upload progress.
 */
const FileUpload = ({ onFileSelect, disabled = false, maxSize = 10 * 1024 * 1024 }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
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
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  /**
   * Handle drag and drop events
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
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
    setSelectedFile(null);
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
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
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
          <div className="file-selected">
            <div className="file-info">
              <span className="file-icon">📄</span>
              <div className="file-details">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button
              className="file-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              disabled={disabled}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="file-upload-prompt">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div className="upload-subtext">
              CSV, Excel, JSON, SQL files (max {Math.round(maxSize / (1024 * 1024))}MB)
            </div>
          </div>
        )}
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
