import { useState, useEffect, useRef } from 'react';

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

    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
   * Format conversation data for export
   */
  const formatConversationData = (conv, format) => {
    const baseData = {
      id: conv.id,
      title: conv.title || `Conversation ${conv.id?.slice(0, 8)}`,
      createdAt: conv.createdAt || conv.timestamp,
      messages: conv.messages || []
    };

    switch (format) {
      case 'json':
        return JSON.stringify(baseData, null, 2);
      
      case 'csv':
        return convertToCSV(baseData);
      
      case 'txt':
        return convertToText(baseData);
      
      default:
        return JSON.stringify(baseData, null, 2);
    }
  };

  /**
   * Convert conversation to CSV format
   */
  const convertToCSV = (data) => {
    const headers = ['Message ID', 'Role', 'Content', 'SQL Query', 'Timestamp'];
    const rows = data.messages.map(msg => [
      msg.id || '',
      msg.role || '',
      `"${(msg.content || '').replace(/"/g, '""')}"`,
      `"${(msg.sql || '').replace(/"/g, '""')}"`,
      msg.timestamp || ''
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  };

  /**
   * Convert conversation to plain text format
   */
  const convertToText = (data) => {
    let text = `Conversation: ${data.title}\n`;
    text += `ID: ${data.id}\n`;
    text += `Created: ${data.createdAt}\n\n`;
    text += 'Messages:\n';
    text += '='.repeat(50) + '\n\n';

    data.messages.forEach((msg, index) => {
      text += `${index + 1}. ${msg.role?.toUpperCase()}\n`;
      text += `   ${msg.content || ''}\n`;
      
      if (msg.sql) {
        text += `   SQL: ${msg.sql}\n`;
      }
      
      if (msg.timestamp) {
        text += `   Time: ${msg.timestamp}\n`;
      }
      
      text += '\n';
    });

    return text;
  };

  /**
   * Download file
   */
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle export button click
   */
  const handleExportClick = () => {
    setShowOptions(true);
  };

  /**
   * Get file extension for format
   */
  const getFileExtension = (format) => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'txt': return 'txt';
      default: return 'json';
    }
  };

  /**
   * Get MIME type for format
   */
  const getMimeType = (format) => {
    switch (format) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'txt': return 'text/plain';
      default: return 'application/json';
    }
  };

  if (!conversation) {
    return null;
  }

  return (
    <>
      <button
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

      {showOptions && (
        <div className="conversation-export-modal-overlay">
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
        </div>
      )}
    </>
  );
};

export default ConversationExport;
