import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Chat from './pages/Chat.jsx'
import './App.css'

function Welcome() {
  return (
    <center>
    <div className="flex flex-col items-center justify-center h-screen welcome-bg welcome-content">
      <div className="welcome-split">
        <div className="welcome-left">
          <h1 className="text-5xl font-bold">Welcome to AskDB</h1>
          <h2 className="text-base font-semibold">Connect with your Data Base</h2>
        </div>
        <div className="welcome-right">
          <div className="flex flex-col items-center w-full max-w-md">
            <Login />
          </div>
        </div>
      </div>
    </div>
    </center>
  );
}

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

// Public Route component (redirect to chat if already authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated() ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Welcome />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ErrorBoundary>
              <Chat />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
      </Routes>
    </ToastProvider>
  );
}
