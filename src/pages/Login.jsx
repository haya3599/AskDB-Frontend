import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await login(email, password, rememberMe)
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
    <div className="auth-container">
      <h2>Log in</h2>
      <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="Your password"
              required
              disabled={loading}
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={loading}
          />
          <span>Remember me for 30 days</span>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  )
}

export default Login


