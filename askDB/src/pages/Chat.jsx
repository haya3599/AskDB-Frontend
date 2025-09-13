import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { chatAPI } from '../services/api'
import MessageContent from '../components/MessageContent'
import './Chat.css'

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
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  
  // Refs and hooks
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

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
   * Handle message submission and AI processing
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    setError('')
    
    // Add user message to chat immediately
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      // Send message to backend with current conversation context
      const response = await chatAPI.sendMessage(trimmed, null, currentConversationId)
      const { message, conversation_id, data } = response.data
      
      // Create structured assistant message with SQL and results
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        sql: data?.sql || null,
        results: data?.results || null,
        actionType: data?.action_type || 'chat'
      }
      setMessages((prev) => [...prev, assistantMsg])
      
      // Update conversation ID for new or changed conversations
      if (conversation_id && conversation_id !== currentConversationId) {
        setCurrentConversationId(conversation_id)
      }
      
      // Refresh conversation list to show updates
      loadConversations()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send message')
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
    setError('')
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
      setError('Invalid conversation ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    setDeletingConversation(conversationId);
    setError('');

    try {
      await chatAPI.deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If this was the current conversation, start a new one
      if (currentConversationId === conversationId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      
      // Parse error message from API response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to delete conversation';
      setError(errorMessage);
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
    setLoadingConversation(true)
    setError('')
    
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
    } catch (error) {
      setError('Failed to load conversation')
    } finally {
      setLoadingConversation(false)
    }
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
          <button onClick={logout} className="chat-header-link">Logout</button>
        </div>
      </header>

      <main className="chat-main">
        <aside className="chat-sidebar">
          <button className="new-chat-btn" onClick={startNewChat}>+ New chat</button>
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
                      onClick={() => loadConversation(conv.id)}
                      disabled={loadingConversation}
                    >
                      <div className="conversation-content">
                        <div className="conversation-title">
                          {conv.title || `Conversation ${conv.id.slice(0, 8)}`}
                        </div>
                      </div>
                    </button>
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
                ))}
              </div>
            ) : (
              <div className="sidebar-empty">No conversations yet</div>
            )}
          </div>
        </aside>

        <section className="chat-content">
          {error && <div className="error-message">{error}</div>}
          {loadingConversation && (
            <div className="loading-conversation">
              <div className="loading-spinner"></div>
              Loading conversation...
            </div>
          )}
          <div ref={listRef} className="message-list">
            {messages.map((m) => (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className="avatar" aria-hidden>{m.role === 'assistant' ? 'A' : 'U'}</div>
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

          <form className="composer" onSubmit={handleSubmit}>
            <input
              className="composer-input"
              placeholder="Message askDB..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
            />
            <button className="composer-send" type="submit" disabled={isSending || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}


