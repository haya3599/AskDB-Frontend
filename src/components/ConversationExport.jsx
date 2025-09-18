import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * ConversationExport Component
 * 
 * Provides functionality to export conversation data in various formats.
 * Supports JSON, CSV, and plain text export options.
 */
const ConversationExport = ({ 
  conversation, 
  onExport, 
  disabled = false 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [showOptions, setShowOptions] = useState(false);
  const popupRef = useRef(null);

  /**
   * Handle clicks outside the popup to close it
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowOptions(false);
      }
    };

    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    };
  }, [showOptions]);

  /**
   * Export conversation data
   */
  const handleExport = async (format) => {
    if (!conversation || disabled) return;

    setIsExporting(true);
    
    try {
      await onExport(conversation, format);
      setShowOptions(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export conversation. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


  /**
   * Handle export button click
   */
  const handleExportClick = () => {
    setShowOptions(true);
  };


  if (!conversation) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`conversation-export-btn ${isExporting ? 'exporting' : ''}`}
        onClick={handleExportClick}
        disabled={disabled || isExporting}
        title="Export conversation"
      >
        {isExporting ? (
          <>
            <div className="export-spinner"></div>
            Exporting...
          </>
        ) : (
          <>
            <span className="export-icon">📥</span>
            Export
          </>
        )}
      </button>

      {/* Export Modal */}
      {showOptions && createPortal(
        <div 
          className="conversation-export-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOptions(false);
            }
          }}
        >
          <div className="conversation-export-modal" ref={popupRef}>
            <div className="export-modal-header">
              <h3>Export Conversation</h3>
              <button
                className="export-modal-close-btn"
                onClick={() => setShowOptions(false)}
                disabled={isExporting}
              >
                ✕
              </button>
            </div>
            
            <div className="export-modal-content">
              <p className="export-modal-description">
                Choose the format for exporting <strong>{conversation.title || `Conversation ${conversation.id?.slice(0, 8)}`}</strong>:
              </p>
              
              <div className="export-format-options">
                <label className="export-format-option">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                  />
                  <span className="format-label">
                    <span className="format-name">JSON</span>
                    <span className="format-desc">Structured data format (.json)</span>
                  </span>
                </label>

                <label className="export-format-option">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                  />
                  <span className="format-label">
                    <span className="format-name">CSV</span>
                    <span className="format-desc">Spreadsheet format (.csv)</span>
                  </span>
                </label>

                <label className="export-format-option">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={exportFormat === 'txt'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                  />
                  <span className="format-label">
                    <span className="format-name">Text</span>
                    <span className="format-desc">Plain text format (.txt)</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="export-modal-actions">
              <button
                className="export-download-btn"
                onClick={() => handleExport(exportFormat)}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="export-spinner"></div>
                    Downloading...
                  </>
                ) : (
                  'Download'
                )}
              </button>
              <button
                className="export-cancel-btn"
                onClick={() => setShowOptions(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      
    </>
  );
};

export default ConversationExport;
