import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome</h1>
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
  );
}

function SignUp() {
  return <h1 className="text-2xl">Sign Up Page</h1>;
}

function Login() {
  return <h1 className="text-2xl">Login Page</h1>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}
