import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Chat from './pages/Chat.jsx'
import './App.css'

function Welcome() {
  return (
    <center>
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome to askDB</h1>
      <div className="flex gap-4">
        <Link to="/signup">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-800">
            Sign Up
          </button>
        </Link>
        <Link to="/login">
          <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-800">
            Login
          </button>
        </Link>
        <button
          className="google-btn"
          onClick={() => {
            console.log('Google sign-in clicked')
            // TODO: integrate Google OAuth
          }}
        >
          <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.62 32.49 29.21 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.816C14.377 16.104 18.789 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.67 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.159 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.217 35.49 25.596 37 24 37c-5.179 0-9.565-3.482-11.158-8.261l-6.531 5.027C9.64 39.556 16.31 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.355 3.99-5.482 7-11.303 7-5.179 0-9.565-3.482-11.158-8.261l-6.531 5.027C9.64 39.556 16.31 44 24 44c8.088 0 18-5.875 18-20 0-1.341-.138-2.651-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
    </center>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  );
}
