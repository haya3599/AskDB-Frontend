import { useState } from 'react';

/**
 * MessageContent Component
 * 
 * Renders structured AI responses with message text, SQL queries, and results.
 * Provides a ChatGPT-like experience with copy-to-clipboard functionality
 * and formatted table display for query results.
 * 
 * @param {Object} message - Message object containing content, sql, results, etc.
 */
const MessageContent = ({ message }) => {
  const [copied, setCopied] = useState(false);

  /**
   * Copy text to clipboard with user feedback
   * 
   * @param {string} text - Text to copy to clipboard
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  /**
   * Format query results as an HTML table
   * 
   * @param {Array|Object} results - Array of result objects or MySQL2 result object
   * @returns {JSX.Element|null} Formatted table or null if no results
   */
  const formatResults = (results) => {
    // Handle MySQL2 result format (object with rows property)
    let dataRows = results;
    if (results && typeof results === 'object' && results.rows) {
      dataRows = results.rows;
    }
    
    if (!dataRows || !Array.isArray(dataRows)) {
      return null;
    }
    
    if (dataRows.length === 0) {
      return <div className="no-results">No results found</div>;
    }

    const headers = Object.keys(dataRows[0]);
    
    return (
      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="results-info">
          {dataRows.length} row{dataRows.length !== 1 ? 's' : ''} returned
        </div>
      </div>
    );
  };

  // Handle typing indicator
  if (message.isTyping) {
    return (
      <div className="message-content">
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-content">
      {/* Main message content */}
      <div className="message-text">
        {message.content}
      </div>

      {/* SQL Query Section - only show if there's actual SQL */}
      {message.sql && message.sql.trim() && (
        <div className="sql-section">
          <div className="sql-header">
            <span className="sql-label">SQL Query</span>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(message.sql)}
              title="Copy SQL query"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="sql-code">
            <pre><code>{message.sql}</code></pre>
          </div>
        </div>
      )}

      {/* Results Section - only show if there are actual results */}
      {message.results && (
        (Array.isArray(message.results) && message.results.length > 0) ||
        (message.results.rows && Array.isArray(message.results.rows) && message.results.rows.length > 0)
      ) && (
        <div className="results-section">
          <div className="results-header">
            <span className="results-label">Query Results</span>
          </div>
          {formatResults(message.results)}
        </div>
      )}
      
      {/* Show "No results" message only if there are results but they're empty */}
      {message.results && (
        (Array.isArray(message.results) && message.results.length === 0) ||
        (message.results.rows && Array.isArray(message.results.rows) && message.results.rows.length === 0)
      ) && (
        <div className="results-section">
          <div className="results-header">
            <span className="results-label">Query Results</span>
          </div>
          <div className="no-results">No results found</div>
        </div>
      )}
    </div>
  );
};

export default MessageContent;
