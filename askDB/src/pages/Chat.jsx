import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 'm1', role: 'assistant', content: 'Hi! Ask me anything about your database.' }
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    // Simulate assistant response. Replace with API call later.
    setTimeout(() => {
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `You said: "${trimmed}". (This is a demo response.)`
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsSending(false)
    }, 600)
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-left">
          <Link to="/" className="chat-logo">askDB</Link>
          <span className="chat-title">Chat</span>
        </div>
        <div className="chat-header-right">
          <Link to="/login" className="chat-header-link">Login</Link>
          <Link to="/signup" className="chat-header-link">Sign up</Link>
        </div>
      </header>

      <main className="chat-main">
        <aside className="chat-sidebar">
          <button className="new-chat-btn" onClick={() => setMessages([{ id: 'm1', role: 'assistant', content: 'New conversation started. How can I help?' }])}>+ New chat</button>
          <div className="sidebar-sections">
            <div className="sidebar-section-title">Conversations</div>
            <div className="sidebar-empty">(history coming soon)</div>
          </div>
        </aside>

        <section className="chat-content">
          <div ref={listRef} className="message-list">
            {messages.map((m) => (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className="avatar" aria-hidden>{m.role === 'assistant' ? 'A' : 'U'}</div>
                <div className="bubble">
                  {m.content}
                </div>
              </div>
            ))}
          </div>

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


