import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)

    // Basic client-side validation
    if (!name.trim()) {
      showError('Please enter your name')
      setLoading(false)
      return
    }
    if (!email.trim()) {
      showError('Please enter your email')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }
    
    // Check password complexity
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    
    if (!hasLowercase || !hasUppercase || !hasNumber) {
      showError('Password must contain at least one lowercase letter, one uppercase letter, and one number')
      setLoading(false)
      return
    }

    try {
      const result = await register({ name, email, password })
      if (result.success) {
        showSuccess(result.message)
        // Small delay to show success message before redirect
        setTimeout(() => {
          navigate('/chat')
        }, 1500)
      } else {
        showError(result.error)
      }
    } catch (err) {
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen welcome-bg welcome-content">
      <div className="auth-container">
        <h2>Sign up</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={loading}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min. 8 chars, must include A-Z, a-z, 0-9)"
                required
                disabled={loading}
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup


