import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { chatAPI, databasesAPI } from '../services/api'
import { extractErrorMessage, logTechnicalError } from '../utils/errorUtils'

// Utility function to escape HTML characters
const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
import MessageContent from '../components/MessageContent'
import FileUpload from '../components/FileUpload'
import QuerySearch from '../components/QuerySearch'
import ConversationExport from '../components/ConversationExport'
import DatabaseExport from '../components/DatabaseExport'
import SQLConfirmationModal from '../components/SQLConfirmationModal'
import CreateDatabaseModal from '../components/CreateDatabaseModal'
import './Chat.css'
import '../components/FileUpload.css'
import '../components/QuerySearch.css'
import '../components/ConversationExport.css'
import '../components/DatabaseExport.css'
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
  const [showDatabaseAlert, setShowDatabaseAlert] = useState(false)
  
  // SQL Confirmation Modal state
  const [showSQLConfirmation, setShowSQLConfirmation] = useState(false)
  const [pendingSQL, setPendingSQL] = useState('')
  const [pendingMessageId, setPendingMessageId] = useState(null)
  const [isConfirmingSQL, setIsConfirmingSQL] = useState(false)
  
  // Create Database Modal state
  const [showCreateDatabaseModal, setShowCreateDatabaseModal] = useState(false)
  const [isCreatingDatabase, setIsCreatingDatabase] = useState(false)
  
  // Refs and hooks
  const listRef = useRef(null)
  const timeoutRefs = useRef([])
  const fileInputRef = useRef(null)
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

  // Check if user should see welcome dashboard (only for new users with no databases)
  // Only show welcome dashboard on initial load, not when databases are refreshed
  useEffect(() => {
    if (isAuthenticated() && databases.length === 0 && !showWelcome && conversations.length === 0) {
      // New user with no databases and no conversations, show welcome dashboard
      setShowWelcome(true)
    }
  }, [databases, isAuthenticated, showWelcome, conversations.length])

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

  // Cleanup timeouts and file input on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutRefs.current = []
      if (fileInputRef.current) {
        fileInputRef.current.remove()
        fileInputRef.current = null
      }
    }
  }, [])

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
    
    // Validate input length
    if (trimmed.length > 10000) {
      showError('Message is too long. Please keep it under 10,000 characters.')
      return
    }
    
    if ((!trimmed && !selectedFile) || isSending) return
    
    // If on welcome dashboard, allow sending without database selection
    if (showWelcome) {
      await handleFirstMessage(trimmed)
      return
    }
    
    if (!selectedDatabaseId && !selectedFile) {
      setShowDatabaseAlert(true)
      showError('Please choose a database before sending a message.')
      return
    }
    
    // Add user message to chat immediately
    const userMsg = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: escapeHtml(trimmed || (selectedFile ? `Uploaded file: ${selectedFile.name}` : 'File uploaded'))
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      // Send message to backend with current conversation context and file
      const response = await chatAPI.sendMessage(trimmed, selectedFile, currentConversationId, selectedDatabaseId || null)
      
      // Defensive programming - ensure response data exists
      if (!response?.data) {
        throw new Error('Invalid response from server')
      }
      
      const { message, conversation_id, data, requiresConfirmation, messageId, sql } = response.data
      
      // Clear selected file after sending
      setSelectedFile(null)
      
      // Always show typing indicator first for AI responses
      const typingMsg = { id: 'typing', role: 'assistant', content: 'typing', isTyping: true }
      setMessages((prev) => [...prev, typingMsg])
      
      // Check if SQL confirmation is required
      if (requiresConfirmation && messageId && sql) {
        // Remove typing indicator and show SQL confirmation modal
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
        setPendingSQL(sql)
        setPendingMessageId(messageId)
        setShowSQLConfirmation(true)
        
        // Wait for user confirmation before adding message to chat
      } else {
        // Normal response - replace typing indicator with actual response after delay
        const timeoutId = setTimeout(() => {
          setMessages(prev => {
            const newMessages = prev.filter(msg => msg.id !== 'typing')
            const assistantMsg = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: message,
              sql: data?.sql || null,
              results: data?.results || null,
              actionType: data?.action_type || 'chat'
            }
            return [...newMessages, assistantMsg]
          })
        }, 800) // 800ms delay to show typing indicator
        timeoutRefs.current.push(timeoutId)
      }
      
      // Update conversation ID for new or changed conversations
      if (conversation_id && conversation_id !== currentConversationId) {
        setCurrentConversationId(conversation_id)
      }
      
      // Refresh conversation list to show updates
      loadConversations()
      
      // Refresh database list in case a new database was created
      loadDatabases()
    } catch (error) {
      logTechnicalError(error, 'send message')
      const userFriendlyMessage = extractErrorMessage(error, 'send message')
      showError(userFriendlyMessage)
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
    
    // Add user message to chat immediately and switch to chat mode
    const userMsg = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: escapeHtml(message || (selectedFile ? `Uploaded file: ${selectedFile.name}` : 'File uploaded'))
    }
    setMessages([userMsg])
    setInput('')
    setShowWelcome(false) // Switch to chat immediately
    showInfo('New conversation started') // Show toast when transitioning to chat
    
    // Add typing indicator
    const typingMsg = { id: 'typing', role: 'assistant', content: 'typing', isTyping: true }
    setMessages(prev => [...prev, typingMsg])
    
    try {
      // Send message to backend
      const response = await chatAPI.sendMessage(message, selectedFile, null, selectedDatabaseId || null)
      
      // Defensive programming - ensure response data exists
      if (!response?.data) {
        throw new Error('Invalid response from server')
      }
      
      const { message: aiResponse, conversation_id, data, requiresConfirmation, messageId, sql } = response.data
      
      // Clear selected file after sending
      setSelectedFile(null)
      
      // Check if SQL confirmation is required
      if (requiresConfirmation && messageId && sql) {
        // Remove typing indicator and show SQL confirmation modal
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
        setPendingSQL(sql)
        setPendingMessageId(messageId)
        setShowSQLConfirmation(true)
      } else {
        // Normal response - replace typing indicator with actual response after delay
        const timeoutId = setTimeout(() => {
          setMessages(prev => {
            const newMessages = prev.filter(msg => msg.id !== 'typing')
            const assistantMsg = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: aiResponse,
              sql: data?.sql || null,
              results: data?.results || null,
              actionType: data?.action_type || 'chat'
            }
            return [...newMessages, assistantMsg]
          })
        }, 800) // 800ms delay to show typing indicator
        timeoutRefs.current.push(timeoutId)
      }
      
      // Update conversation ID
      if (conversation_id) {
        setCurrentConversationId(conversation_id)
      }
      
      // Refresh conversation list
      loadConversations()
      
      // Refresh database list in case a new database was created
      loadDatabases()
      
    } catch (error) {
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
      
      logTechnicalError(error, 'send first message')
      const userFriendlyMessage = extractErrorMessage(error, 'send first message')
      showError(userFriendlyMessage)
      
      // If this was a new conversation attempt that failed, go back to welcome dashboard
      if (!currentConversationId) {
        setMessages([{ id: 'm1', role: 'assistant', content: 'Hi! Ask me anything about your database.' }])
        setShowWelcome(true)
        showInfo('Please try again from the welcome dashboard')
      } else {
        // For existing conversations, show error message
        const errorMsg = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Start a new conversation by showing welcome dashboard
   */
  const startNewChat = () => {
    setMessages([{ id: 'm1', role: 'assistant', content: 'Hi! Ask me anything about your database.' }])
    setCurrentConversationId(null)
    setShowWelcome(true)
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
      logTechnicalError(error, 'delete conversation');
      const userFriendlyMessage = extractErrorMessage(error, 'delete conversation');
      showError(userFriendlyMessage);
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
    // Skip reload if this conversation is already active
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
      logTechnicalError(error, 'load conversation')
      const userFriendlyMessage = extractErrorMessage(error, 'load conversation')
      showError(userFriendlyMessage)
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
    if (file) {
      setShowDatabaseAlert(false)
    }
  }

  /**
   * Handle upload database button click
   */
  const handleUploadDatabase = () => {
    // Prevent multiple simultaneous operations
    if (isSending || isCreatingDatabase) {
      showError('Please wait for the current operation to complete')
      return
    }
    
    // Clean up any existing file input
    if (fileInputRef.current) {
      fileInputRef.current.remove()
    }
    
    // Create new file input
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.sql,.db'
    fileInput.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        // Validate file type
        const allowedTypes = ['.sql', '.db']
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        
        if (!allowedTypes.includes(fileExtension)) {
          showError('Please select a .sql or .db file')
          return
        }
        
        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          showError('File size must be less than 50MB')
          return
        }
        
        setSelectedFile(file)
        // Automatically send the file
        handleFirstMessage(`Create a database from this file: ${file.name}`)
      }
      
      // Clean up the file input after use
      if (fileInputRef.current) {
        fileInputRef.current.remove()
        fileInputRef.current = null
      }
    }
    
    // Store reference and trigger click
    fileInputRef.current = fileInput
    fileInput.click()
  }

  /**
   * Handle create database from modal
   */
  const handleCreateDatabase = async (databaseName) => {
    setIsCreatingDatabase(true)
    // Close modal immediately when database creation starts
    setShowCreateDatabaseModal(false)
    
    try {
      // Send the create database message
      await handleFirstMessage(`create a new database called ${databaseName}`)
      // Ensure we stay in chat mode after database creation
      setShowWelcome(false)
    } catch (error) {
      console.error('Error creating database:', error)
      showError('Failed to create database. Please try again.')
      // Reopen modal on error so user can try again
      setShowCreateDatabaseModal(true)
    } finally {
      setIsCreatingDatabase(false)
    }
  }

  /**
   * Search through conversation history
   * 
   * @param {string} term - Search term
   * @returns {Promise<Array>} Search results
   */
  const handleSearch = async (term) => {
    try {
      // Perform local search through conversations
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
        createdAt: conversation.created_at || conversation.last_message_at || new Date().toISOString(),
        messages: messages.flatMap(msg => [
          {
            id: `${msg.id}-user`,
            role: 'user',
            content: msg.prompt || '',
            timestamp: msg.timestamp
          },
          {
            id: msg.id,
            role: 'assistant',
            content: msg.ai_response || '',
            sql: msg.sql_query || null,
            results: msg.results || null,
            timestamp: msg.timestamp
          }
        ])
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
      logTechnicalError(error, 'export conversation')
      const userFriendlyMessage = extractErrorMessage(error, 'export conversation')
      showError(userFriendlyMessage)
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
    
    // Show typing indicator while executing SQL
    const typingMsg = { id: 'typing', role: 'assistant', content: 'typing', isTyping: true }
    setMessages((prev) => [...prev, typingMsg])
    
    try {
      const response = await chatAPI.confirmSQL(pendingMessageId, sql)
      const { message, data } = response.data
      
      // Replace typing indicator with actual result after delay
      const timeoutId = setTimeout(() => {
        setMessages(prev => {
          const newMessages = prev.filter(msg => msg.id !== 'typing')
          const resultMsg = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: ` ${message || 'SQL executed successfully'}`,
            sql: sql,
            results: data?.results || null,
            actionType: 'sql_executed'
          }
          return [...newMessages, resultMsg]
        })
      }, 600) // 600ms delay for SQL execution
      timeoutRefs.current.push(timeoutId)
      
      showSuccess('SQL executed successfully')
      
      // Close the modal
      setShowSQLConfirmation(false)
      setPendingSQL('')
      setPendingMessageId(null)
      
      // Ensure we stay in chat mode after SQL execution
      setShowWelcome(false)
      
      // Refresh conversation list
      loadConversations()
      
      // Refresh database list in case a new database was created
      loadDatabases()
      
    } catch (error) {
      // Remove typing indicator on error
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
      logTechnicalError(error, 'execute SQL')
      const userFriendlyMessage = extractErrorMessage(error, 'execute SQL')
      showError(userFriendlyMessage)
    } finally {
      setIsConfirmingSQL(false)
    }
  }

  /**
   * Handle SQL confirmation cancellation
   */
  const handleSQLCancellation = async () => {
    if (!pendingMessageId) return
    
    try {
      // Call the backend to cancel the SQL operation and remove the message
      await chatAPI.cancelSQL(pendingMessageId)
      
      // Check if this is a new conversation (no conversation ID or empty messages)
      const isNewConversation = !currentConversationId || messages.length <= 1
      
      if (isNewConversation) {
        // For new conversations, delete the conversation but stay in chat mode
        if (currentConversationId) {
          try {
            await chatAPI.deleteConversation(currentConversationId)
          } catch (deleteError) {
            console.error('Failed to delete conversation:', deleteError)
            // Continue anyway - don't block the user
          }
        }
        
        // Reset state but stay in chat mode
        setMessages([{ id: 'm1', role: 'assistant', content: 'Hi! Ask me anything about your database.' }])
        setCurrentConversationId(null)
        setShowWelcome(false) // Stay in chat mode
        
        // Refresh conversation list to remove the deleted conversation
        loadConversations()
        
        showInfo('Operation cancelled')
      } else {
        // For existing conversations, just remove the last message
        setMessages(prev => {
          // Remove the last message (the one that triggered SQL confirmation)
          return prev.slice(0, -1)
        })
        showSuccess('SQL operation cancelled')
      }
      
      // Close the modal
      setShowSQLConfirmation(false)
      setPendingSQL('')
      setPendingMessageId(null)
      
    } catch (error) {
      logTechnicalError(error, 'cancel SQL operation')
      const userFriendlyMessage = extractErrorMessage(error, 'cancel SQL operation')
      showError(userFriendlyMessage)
      
      // Still close the modal even if there's an error
      setShowSQLConfirmation(false)
      setPendingSQL('')
      setPendingMessageId(null)
    }
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-left">
          <Link to="/" className="chat-logo">AskDB</Link>
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
          <button className="new-chat-btn" onClick={startNewChat}>+ New conversation</button>
          
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
                <h1>
                  <span className="emoji" role="img" aria-label="rocket">🚀</span> Welcome to AskDB
                </h1>
                {databases.length === 0 ? (
                  <p>To get started, choose how you'd like to create your first database</p>
                ) : (
                  <p>Start a new conversation with a database or skip to chat</p>
                )}
              </div>
              
              <div className="welcome-actions">
                <button 
                  className="welcome-action-btn"
                  onClick={handleUploadDatabase}
                  disabled={isSending}
                >
                  <div className="welcome-action-icon">📁</div>
                  <div className="welcome-action-content">
                    <h3 className="welcome-action-title">Upload Database File</h3>
                    <p className="welcome-action-description">Upload an existing .sql or .db file to get started quickly</p>
                  </div>
                </button>
                
                <button 
                  className="welcome-action-btn"
                  onClick={() => {
                    if (isSending || isCreatingDatabase) {
                      showError('Please wait for the current operation to complete')
                      return
                    }
                    setShowCreateDatabaseModal(true)
                  }}
                  disabled={isSending || isCreatingDatabase}
                >
                  <div className="welcome-action-icon">➕</div>
                  <div className="welcome-action-content">
                    <h3 className="welcome-action-title">Create New Database</h3>
                    <p className="welcome-action-description">Start fresh with a new empty database</p>
                  </div>
                </button>

                {databases.length > 0 && (
                  <button 
                    className="welcome-action-btn skip-btn"
                    onClick={() => {
                      if (isSending || isCreatingDatabase) {
                        showError('Please wait for the current operation to complete')
                        return
                      }
                      setShowWelcome(false)
                      showInfo('New conversation started')
                    }}
                    disabled={isSending || isCreatingDatabase}
                  >
                    <div className="welcome-action-icon">⚡</div>
                    <div className="welcome-action-content">
                      <h3 className="welcome-action-title">Skip to Chat</h3>
                      <p className="welcome-action-description">Start chatting with your existing databases</p>
                    </div>
                  </button>
                )}
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
                    <div className="avatar" aria-hidden>{m.role === 'assistant' ? '🤖' : (user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U')}</div>
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
                  className={`db-selector ${showDatabaseAlert ? 'alert' : ''}`}
                  value={selectedDatabaseId}
                  onChange={(e) => {
                    setSelectedDatabaseId(e.target.value)
                    if (e.target.value) {
                      setShowDatabaseAlert(false)
                    }
                  }}
                  disabled={isSending}
                  title="Select a database (optional)"
                >
                  <option value="">Choose database</option>
                  {databases.map((db) => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
                <DatabaseExport
                  databaseId={selectedDatabaseId}
                  databaseName={databases.find(db => db.id === selectedDatabaseId)?.name}
                  disabled={isSending}
                />
                  <input
                    className="composer-input"
                    placeholder="Message AskDB..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isSending}
                    maxLength={10000}
                  />
                  <div className="composer-actions">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      disabled={isSending}
                      maxSize={10 * 1024 * 1024} // 10MB
                      selectedFile={selectedFile}
                    />
                    <button className="composer-send" type="submit" disabled={isSending || (!input.trim() && !selectedFile)}>
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
      
      <CreateDatabaseModal
        isOpen={showCreateDatabaseModal}
        onClose={() => setShowCreateDatabaseModal(false)}
        onCreateDatabase={handleCreateDatabase}
        isCreating={isCreatingDatabase}
      />
    </div>
  )
}


