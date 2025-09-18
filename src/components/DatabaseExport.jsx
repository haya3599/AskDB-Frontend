import { useState, useEffect, useRef } from 'react';
import { databasesAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './DatabaseExport.css';

/**
 * DatabaseExport Component
 * 
 * Provides functionality to export database data in various formats.
 * Supports SQL, JSON, and DB export options.
 */
const DatabaseExport = ({ 
  databaseId, 
  databaseName,
  disabled = false 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('sql');
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

  /**
   * Handle clicks outside the modal to close it
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  /**
   * Export database data
   */
  const handleExport = async (format) => {
    if (!databaseId || disabled) return;

    setIsExporting(true);
    
    try {
      const response = await databasesAPI.export(databaseId, format);
      
      // Create download
      const mimeType = getMimeType(format);
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database-${databaseName || databaseId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`Database exported as ${format.toUpperCase()}`);
      setShowModal(false);
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export database. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Get MIME type for format
   */
  const getMimeType = (format) => {
    switch (format) {
      case 'sql': return 'application/sql';
      case 'json': return 'application/json';
      case 'db': return 'application/octet-stream';
      default: return 'application/sql';
    }
  };

  /**
   * Handle export button click
   */
  const handleExportClick = () => {
    if (!databaseId) {
      showError('Please select a database first');
      return;
    }
    setShowModal(true);
  };

  // Always render the button, but disable it when no database is selected

  return (
    <>
      <button
        className={`database-export-btn ${isExporting ? 'exporting' : ''}`}
        onClick={handleExportClick}
        disabled={disabled || isExporting || !databaseId}
        title={databaseId ? "Export selected database" : "Select a database to export"}
      >
        {isExporting ? (
          <>
            <div className="export-spinner"></div>
            Exporting...
          </>
        ) : (
          <>
            <span className="export-icon"></span>
            Export
          </>
        )}
      </button>

      {showModal && (
        <div className="database-export-modal-overlay">
          <div className="database-export-modal" ref={modalRef}>
            <div className="export-modal-header">
              <h3>Export Database</h3>
              <button
                className="export-modal-close-btn"
                onClick={() => setShowModal(false)}
                disabled={isExporting}
              >
                ✕
              </button>
            </div>
            
            <div className="export-modal-content">
              <p className="export-modal-description">
                Choose the format for exporting <strong>{databaseName}</strong>:
              </p>
              
              <div className="export-format-options">
                <label className="export-format-option">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="sql"
                    checked={exportFormat === 'sql'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                  />
                  <span className="format-label">
                    <span className="format-name">SQL</span>
                    <span className="format-desc">SQL dump file (.sql)</span>
                  </span>
                </label>

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
                    value="db"
                    checked={exportFormat === 'db'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={isExporting}
                  />
                  <span className="format-label">
                    <span className="format-name">Database</span>
                    <span className="format-desc">Binary database file (.db)</span>
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
                onClick={() => setShowModal(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatabaseExport;
