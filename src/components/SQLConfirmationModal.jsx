import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

/**
 * SQLConfirmationModal Component
 * 
 * Modal for confirming and editing SQL queries before execution.
 * Shows SQL in read-only mode initially, allows editing when "Edit" is clicked.
 */
const SQLConfirmationModal = ({ 
  isOpen, 
  sql, 
  onRun, 
  onCancel,
  isLoading = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSql, setEditedSql] = useState(sql);
  const [error, setError] = useState(null);

  // Reset state when modal opens/closes or SQL changes
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setEditedSql(sql);
      setError(null);
    }
  }, [isOpen, sql]);

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleRevert = () => {
    setIsEditing(false);
    setEditedSql(sql); // Reset to original SQL
    setError(null);
  };

  const handleRun = () => {
    try {
      // Basic SQL validation - check if it's not empty
      const sqlToRun = isEditing ? editedSql : sql;
      if (!sqlToRun.trim()) {
        setError('SQL query cannot be empty');
        return;
      }
      
      onRun(sqlToRun);
    } catch (err) {
      setError('Invalid SQL syntax: ' + err.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSql(sql);
    setError(null);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="sql-confirmation-overlay">
      <div className="sql-confirmation-modal">
        <div className="sql-confirmation-header">
          <h3>SQL Preview</h3>
          <p>Review and edit the SQL query before execution.</p>
        </div>

        <div className="sql-confirmation-content">
          <div className="sql-editor-container">
            <Editor
              height="300px"
              language="sql"
              value={isEditing ? editedSql : sql}
              onChange={isEditing ? setEditedSql : undefined}
              options={{
                readOnly: !isEditing,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                theme: 'vs-dark'
              }}
            />
          </div>

          {error && (
            <div className="sql-error">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
            </div>
          )}
        </div>

        <div className="sql-confirmation-actions">
          {!isEditing ? (
            <button
              className="sql-btn sql-btn-primary"
              onClick={handleEdit}
              disabled={isLoading}
            >
              Edit
            </button>
          ) : (
            <button
              className="sql-btn sql-btn-secondary"
              onClick={handleRevert}
              disabled={isLoading}
            >
              Revert
            </button>
          )}
          
          <button
            className="sql-btn sql-btn-success"
            onClick={handleRun}
            disabled={isLoading}
          >
            {isLoading ? 'Executing...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SQLConfirmationModal;
