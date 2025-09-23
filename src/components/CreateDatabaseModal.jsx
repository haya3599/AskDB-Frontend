import React, { useState } from 'react';

/**
 * CreateDatabaseModal Component
 * 
 * Modal for creating a new database with name input
 */
const CreateDatabaseModal = ({ isOpen, onClose, onCreateDatabase, isCreating }) => {
  const [databaseName, setDatabaseName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate database name
    if (!databaseName.trim()) {
      setError('Database name is required');
      return;
    }
    
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(databaseName.trim())) {
      setError('Database name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }
    
    setError('');
    onCreateDatabase(databaseName.trim());
  };

  const handleClose = () => {
    setDatabaseName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Database</h2>
          <button className="modal-close" onClick={handleClose} disabled={isCreating}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="databaseName">Database Name</label>
            <input
              id="databaseName"
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              placeholder="Enter database name (e.g., my_database)"
              disabled={isCreating}
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isCreating || !databaseName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDatabaseModal;
