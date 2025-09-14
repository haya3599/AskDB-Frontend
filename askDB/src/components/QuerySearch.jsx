import { useState, useEffect } from 'react';

/**
 * QuerySearch Component
 * 
 * Provides search functionality for conversation history.
 * Allows users to search through past queries and conversations.
 */
const QuerySearch = ({ 
  conversations = [], 
  onSearch, 
  onClear, 
  placeholder = "Search conversations..." 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  /**
   * Perform search through conversations
   */
  const performSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // Call the search API or perform local search
      const results = await onSearch(term);
      setSearchResults(results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle search input change with debouncing
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  /**
   * Handle search input change
   */
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Clear search
   */
  const handleClear = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    onClear?.();
  };

  /**
   * Handle result click
   */
  const handleResultClick = (result) => {
    // This will be handled by the parent component
    setShowResults(false);
  };

  return (
    <div className="query-search-container">
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          <div className="search-icon">
            {isSearching ? (
              <div className="search-spinner"></div>
            ) : (
              <span>🔍</span>
            )}
          </div>
          {searchTerm && (
            <button
              className="search-clear-btn"
              onClick={handleClear}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="search-results">
          {searchResults.length > 0 ? (
            <div className="search-results-list">
              {searchResults.map((result, index) => (
                <div
                  key={result.id || index}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-header">
                    <span className="result-title">
                      {result.title || `Conversation ${result.id?.slice(0, 8)}`}
                    </span>
                    <span className="result-date">
                      {result.timestamp ? 
                        new Date(result.timestamp).toLocaleDateString() : 
                        'Unknown date'
                      }
                    </span>
                  </div>
                  {result.preview && (
                    <div className="result-preview">
                      {result.preview}
                    </div>
                  )}
                  {result.highlightedText && (
                    <div className="result-highlight">
                      ...{result.highlightedText}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchTerm && !isSearching ? (
            <div className="search-no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">
                No conversations found matching "{searchTerm}"
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default QuerySearch;
