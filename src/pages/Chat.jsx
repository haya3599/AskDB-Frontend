import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { chatAPI, databasesAPI } from '../services/api'
import MessageContent from '../components/MessageContent'
import FileUpload from '../components/FileUpload'
import QuerySearch from '../components/QuerySearch'
import ConversationExport from '../components/ConversationExport'
import SQLConfirmationModal from '../components/SQLConfirmationModal'
import './Chat.css'
import '../components/FileUpload.css'
import '../components/QuerySearch.css'
import '../components/ConversationExport.css'
import '../components/SQLConfirmationModal.css'

/**
 * Chat Component
 * 
 * Main chat interface for AskDB application. Handles real-time messaging,
 * conversation management, and AI interaction. Provides a ChatGPT-like
 * experience with structured message display including SQL queries and results.
 */
export default function Chat() {
  // State management for chat functionality
  const [messages, setMessages] = useState([
    { id: 'm1', role: 'assistant', content: 'Hi! Ask me anything about your database.' }
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  // Welcome Dashboard state
  const [showWelcome, setShowWelcome] = useState(true)
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [databases, setDatabases] = useState([])
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('')
  
  // SQL Confirmation Modal state
  const [showSQLConfirmation, setShowSQLConfirmation] = useState(false)
  const [pendingSQL, setPendingSQL] = useState('')
  const [pendingMessageId, setPendingMessageId] = useState(null)
  const [isConfirmingSQL, setIsConfirmingSQL] = useState(false)
  
  // Refs and hooks
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { success: showSuccess, error: showError, info: showInfo } = useToast()

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Load user conversations on component mount
  useEffect(() => {
    if (isAuthenticated()) {
      loadConversations()
      loadDatabases()
    }
  }, [isAuthenticated])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // Handle scroll events to show/hide scroll to bottom button
  useEffect(() => {
    const scrollContainer = listRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
      setShowScrollToBottom(!isNearBottom)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [messages]) // Re-attach when messages change

  /**
   * Load user's conversation list from the backend
   */
  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations()
      setConversations(response.data.conversations || [])
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  /**
   * Load user's databases for dropdown selection
   */
  const loadDatabases = async () => {
    try {
      const response = await databasesAPI.getAll()
      setDatabases(response.data?.databases || response.data || [])
    } catch (error) {
      console.error('Failed to load databases:', error)
    }
  }

  /**
   * Handle message submission and AI processing
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    
    // If on welcome dashboard, allow sending without database selection
    if (showWelcome) {
      await handleFirstMessage(trimmed)
      return
    }
    
    if (!selectedDatabaseId) {
      showError('Please choose a database before sending a message.')
      return
    }
    
    // Add user message to chat immediately
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      // Send message to backend with current conversation context and file
      const response = await chatAPI.sendMessage(trimmed, selectedFile, currentConversationId, selectedDatabaseId || null)
      const { message, conversation_id, data, requiresConfirmation, messageId, sql } = response.data
      
      // Clear selected file after sending
      setSelectedFile(null)
      
      // Check if SQL confirmation is required
      if (requiresConfirmation && messageId && sql) {
        // Show SQL confirmation modal
        setPendingSQL(sql)
        setPendingMessageId(messageId)
        setShowSQLConfirmation(true)
        
        // Don't add any message to chat yet - wait for user confirmation
      } else {
        // Normal response - create structured assistant message with SQL and results
        const assistantMsg = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: message,
          sql: data?.sql || null,
          results: data?.results || null,
          actionType: data?.action_type || 'chat'
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
      
      // Update conversation ID for new or changed conversations
      if (conversation_id && conversation_id !== currentConversationId) {
        setCurrentConversationId(conversation_id)
      }
      
      // Refresh conversation list to show updates
      loadConversations()
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send message')
      const errorMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Handle first message from welcome dashboard
   */
  const handleFirstMessage = async (message) => {
    setIsSending(true)
    
    try {
      // Add user message to chat immediately
      const userMsg = { id: crypto.randomUUID(), role: 'user', content: message }
      setMessages([userMsg])
      setInput('')
      
      // Send message to backend
      const response = await chatAPI.sendMessage(message, selectedFile, null, selectedDatabaseId || null)
      const { message: aiResponse, conversation_id, data, requiresConfirmation, messageId, sql } = response.data
      
      // Clear selected file after sending
      setSelectedFile(null)
      
      // Check if SQL confirmation is required
      if (requiresConfirmation && messageId && sql) {
        setPendingSQL(sql)
        setPendingMessageId(messageId)
        setShowSQLConfirmation(true)
      } else {
        // Normal response - create structured assistant message
        const assistantMsg = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: aiResponse,
          sql: data?.sql || null,
          results: data?.results || null,
          actionType: data?.action_type || 'chat'
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
      
      // Update conversation ID and switch to chat mode
      if (conversation_id) {
        setCurrentConversationId(conversation_id)
      }
      
      // Switch to regular chat interface
      setShowWelcome(false)
      
      // Refresh conversation list
      loadConversations()
      
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send message')
      const errorMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Start a new conversation by resetting the chat state
   */
  const startNewChat = () => {
    setMessages([{ id: 'm1', role: 'assistant', content: 'New conversation started. How can I help?' }])
    setCurrentConversationId(null)
    setShowWelcome(true)
    showInfo('New conversation started')
  }

  /**
   * Scroll to the bottom of the message list
   */
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  /**
   * Delete a conversation
   * 
   * @param {string} conversationId - ID of the conversation to delete
   */
  const deleteConversation = async (conversationId) => {
    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'string') {
      showError('Invalid conversation ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    setDeletingConversation(conversationId);

    try {
      await chatAPI.deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If this was the current conversation, start a new one
      if (currentConversationId === conversationId) {
        startNewChat();
      }
      
      showSuccess('Conversation deleted successfully');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      
      // Parse error message from API response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to delete conversation';
      showError(errorMessage);
    } finally {
      setDeletingConversation(null);
    }
  };

  /**
   * Load conversation history and display messages in structured format
   * 
   * @param {string} conversationId - ID of the conversation to load
   */
  const loadConversation = async (conversationId) => {
    // Don't reload if this conversation is already active
    if (currentConversationId === conversationId) {
      return;
    }
    
    setLoadingConversation(true)
    
    try {
      const response = await chatAPI.getConversationHistory(conversationId)
      const messages = response.data.messages || []
      
      // Transform database messages into chat format with user/assistant pairs
      const transformedMessages = messages.map(msg => {
        // Create user message from stored prompt
        const userMessage = {
          id: `${msg.id}-user`,
          role: 'user',
          content: msg.prompt || 'User message',
          timestamp: msg.timestamp
        }
        
        // Create assistant message with AI response and structured data
        const assistantMessage = {
          id: msg.id,
          role: 'assistant',
          content: msg.ai_response || 'Query executed successfully.',
          sql: msg.sql_query || null,
          results: msg.results || null,
          actionType: msg.query_type || 'chat',
          timestamp: msg.timestamp
        }
        
        return [userMessage, assistantMessage]
      }).flat()
      
      // Sort messages chronologically for proper display order
      transformedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      
      setMessages(transformedMessages)
      setCurrentConversationId(conversationId)
      setShowWelcome(false)
    } catch (error) {
      console.error('Failed to load conversation:', error)
      showError('Failed to load conversation')
    } finally {
      setLoadingConversation(false)
    }
  }

  /**
   * Handle file selection for upload
   * 
   * @param {File|null} file - Selected file or null to clear
   */
  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  /**
   * Search through conversation history
   * 
   * @param {string} term - Search term
   * @returns {Promise<Array>} Search results
   */
  const handleSearch = async (term) => {
    try {
      // For now, perform local search through conversations
      // In a real app, this would call a search API
      const results = conversations.filter(conv => 
        conv.title?.toLowerCase().includes(term.toLowerCase()) ||
        conv.id?.toLowerCase().includes(term.toLowerCase())
      ).map(conv => ({
        id: conv.id,
        title: conv.title || `Conversation ${conv.id.slice(0, 8)}`,
        timestamp: conv.created_at || conv.last_message_at,
        preview: `Conversation with ${conv.message_count || 0} messages`
      }))
      
      return results
    } catch (error) {
      console.error('Search error:', error)
      return []
    }
  }

  /**
   * Clear search results
   */
  const handleSearchClear = () => {
    setSearchResults([])
    setShowSearchResults(false)
  }

  /**
   * Export conversation data
   * 
   * @param {Object} conversation - Conversation to export
   * @param {string} format - Export format (json, csv, txt)
   */
  const handleExport = async (conversation, format) => {
    try {
      // Get full conversation data including messages
      const response = await chatAPI.getConversationHistory(conversation.id)
      const messages = response.data.messages || []
      
      const exportData = {
        id: conversation.id,
        title: conversation.title || `Conversation ${conversation.id.slice(0, 8)}`,
        createdAt: conversation.createdAt || conversation.timestamp,
        messages: messages.map(msg => ({
          id: msg.id,
          role: 'user',
          content: msg.prompt || '',
          timestamp: msg.timestamp
        })).concat(messages.map(msg => ({
          id: `${msg.id}-assistant`,
          role: 'assistant',
          content: msg.ai_response || '',
          sql: msg.sql_query || null,
          results: msg.results || null,
          timestamp: msg.timestamp
        })))
      }

      // Format data based on export format
      let content, filename, mimeType
      
      switch (format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2)
          filename = `conversation-${conversation.id.slice(0, 8)}.json`
          mimeType = 'application/json'
          break
        case 'csv':
          content = convertToCSV(exportData)
          filename = `conversation-${conversation.id.slice(0, 8)}.csv`
          mimeType = 'text/csv'
          break
        case 'txt':
          content = convertToText(exportData)
          filename = `conversation-${conversation.id.slice(0, 8)}.txt`
          mimeType = 'text/plain'
          break
        default:
          throw new Error('Unsupported export format')
      }

      // Download file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showSuccess(`Conversation exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export conversation')
    }
  }

  /**
   * Convert conversation data to CSV format
   */
  const convertToCSV = (data) => {
    const headers = ['Message ID', 'Role', 'Content', 'SQL Query', 'Timestamp']
    const rows = data.messages.map(msg => [
      msg.id || '',
      msg.role || '',
      `"${(msg.content || '').replace(/"/g, '""')}"`,
      `"${(msg.sql || '').replace(/"/g, '""')}"`,
      msg.timestamp || ''
    ])

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
  }

  /**
   * Convert conversation data to plain text format
   */
  const convertToText = (data) => {
    let text = `Conversation: ${data.title}\n`
    text += `ID: ${data.id}\n`
    text += `Created: ${data.createdAt}\n\n`
    text += 'Messages:\n'
    text += '='.repeat(50) + '\n\n'

    data.messages.forEach((msg, index) => {
      text += `${index + 1}. ${msg.role?.toUpperCase()}\n`
      text += `   ${msg.content || ''}\n`
      
      if (msg.sql) {
        text += `   SQL: ${msg.sql}\n`
      }
      
      if (msg.timestamp) {
        text += `   Time: ${msg.timestamp}\n`
      }
      
      text += '\n'
    })

    return text
  }

  /**
   * Handle SQL confirmation - execute the confirmed SQL
   */
  const handleSQLConfirmation = async (sql) => {
    if (!pendingMessageId) return

    setIsConfirmingSQL(true)
    
    try {
      const response = await chatAPI.confirmSQL(pendingMessageId, sql, selectedDatabaseId || null)
      const { message, data } = response.data
      
      // Add the execution result message to chat
      const resultMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message || 'SQL executed successfully',
        sql: sql,
        results: data?.results || null,
        actionType: 'sql_executed'
      }
      setMessages((prev) => [...prev, resultMsg])
      
      showSuccess('SQL executed successfully')
      
      // Close the modal
      setShowSQLConfirmation(false)
      setPendingSQL('')
      setPendingMessageId(null)
      
      // Refresh conversation list
      loadConversations()
      
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to execute SQL')
    } finally {
      setIsConfirmingSQL(false)
    }
  }

  /**
   * Handle SQL confirmation cancellation
   */
  const handleSQLCancellation = () => {
    // Close the modal without adding any message to chat
    setShowSQLConfirmation(false)
    setPendingSQL('')
    setPendingMessageId(null)
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-left">
          <Link to="/" className="chat-logo">askDB</Link>
          <span className="chat-title">Chat</span>
        </div>
        <div className="chat-header-right">
          <span className="user-info">Welcome, {user?.name || user?.email}</span>
          <button onClick={logout} className="chat-header-link logout-btn">
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <main className="chat-main">
        <aside className="chat-sidebar">
          <button className="new-chat-btn" onClick={startNewChat}>+ New chat</button>
          
          <div className="sidebar-search">
            <QuerySearch
              conversations={conversations}
              onSearch={handleSearch}
              onClear={handleSearchClear}
              placeholder="Search conversations..."
            />
          </div>
          
          <div className="sidebar-sections">
            <div className="sidebar-section-title">Conversations</div>
            {conversations.length > 0 ? (
              <div className="conversation-list">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversation-item-wrapper ${currentConversationId === conv.id ? 'active' : ''}`}
                  >
                    <button
                      className="conversation-item"
                      onClick={() => {
                        if (currentConversationId === conv.id) {
                          // Already active - provide subtle feedback
                          showInfo('This conversation is already active');
                        } else {
                          loadConversation(conv.id);
                        }
                      }}
                      disabled={loadingConversation}
                    >
                      <div className="conversation-content">
                        <div className="conversation-title">
                          {conv.title || `Conversation ${conv.id.slice(0, 8)}`}
                        </div>
                      </div>
                    </button>
                    <div className="conversation-actions">
                      <ConversationExport
                        conversation={conv}
                        onExport={handleExport}
                        disabled={loadingConversation}
                      />
                      <button
                        className="conversation-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        title="Delete conversation"
                        disabled={loadingConversation || deletingConversation === conv.id}
                      >
                        {deletingConversation === conv.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sidebar-empty">No conversations yet</div>
            )}
          </div>
        </aside>

        <section className="chat-content">
          {showWelcome ? (
            <div className="welcome-dashboard">
              <div className="welcome-header">
                <h1>🚀 Welcome to AskDB</h1>
                <p>Your AI-powered database assistant is ready to help!</p>
              </div>
              
              <div className="welcome-composer">
                <form className="composer" onSubmit={handleSubmit}>
                  <input
                    className="composer-input"
                    placeholder="Type your message here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isSending}
                  />
                  <div className="composer-actions">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      disabled={isSending}
                      maxSize={10 * 1024 * 1024}
                    />
                    <button 
                      className="composer-send" 
                      type="submit" 
                      disabled={isSending || !input.trim()}
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <>
              {loadingConversation && (
                <div className="loading-conversation">
                  <div className="loading-spinner"></div>
                  Loading conversation...
                </div>
              )}
              <div ref={listRef} className="message-list">
                {messages.map((m) => (
                  <div key={m.id} className={`message-row ${m.role}`}>
                    <div className="avatar" aria-hidden>{m.role === 'assistant' ? '🤖' : 'U'}</div>
                    <div className="bubble">
                      {m.role === 'assistant' ? (
                        <MessageContent message={m} />
                      ) : (
                        <div className="message-text">{m.content}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {showScrollToBottom && (
                <button 
                  className="scroll-to-bottom-btn"
                  onClick={scrollToBottom}
                  title="Scroll to latest message"
                >
                  ↓
                </button>
              )}

              <div className="composer-container">
                <form className="composer" onSubmit={handleSubmit}>
                <select
                  className="db-selector"
                  value={selectedDatabaseId}
                  onChange={(e) => setSelectedDatabaseId(e.target.value)}
                  disabled={isSending}
                  title="Select a database (optional)"
                  required
                >
                  <option value="">Choose database</option>
                  {databases.map((db) => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="composer-export"
                  onClick={async () => {
                    if (!selectedDatabaseId) return;
                    try {
                      // Simple chooser for format
                      const format = window.prompt('Export format? Enter sql, json, or db', 'sql') || 'sql'
                      const res = await databasesAPI.export(selectedDatabaseId, format)
                      const mime = format === 'sql' ? 'application/sql' : (format === 'json' ? 'application/json' : 'application/octet-stream')
                      const blob = new Blob([res.data], { type: mime })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `database-${selectedDatabaseId}.${format}`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    } catch (err) {
                      showError('Failed to export database')
                    }
                  }}
                  disabled={isSending || !selectedDatabaseId}
                  title="Export selected database"
                >
                  Export
                </button>
                  <input
                    className="composer-input"
                    placeholder="Message askDB..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isSending}
                  />
                  <div className="composer-actions">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      disabled={isSending}
                      maxSize={10 * 1024 * 1024} // 10MB
                    />
                    <button className="composer-send" type="submit" disabled={isSending || !input.trim() || !selectedDatabaseId}>
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </section>
      </main>

      {/* SQL Confirmation Modal */}
      <SQLConfirmationModal
        isOpen={showSQLConfirmation}
        sql={pendingSQL}
        onRun={handleSQLConfirmation}
        onCancel={handleSQLCancellation}
        isLoading={isConfirmingSQL}
      />
    </div>
  )
}


