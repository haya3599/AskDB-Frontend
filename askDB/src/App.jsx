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
