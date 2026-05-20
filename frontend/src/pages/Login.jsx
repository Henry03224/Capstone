import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import barangayLogo from '../assets/barangay-logo.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        { username, password }
      );
      login(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left Side - Branding */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center p-10"
        style={{ backgroundColor: '#6C7B74' }} // Dark gray behind logo
      >
        <img src={barangayLogo} alt="Logo" className="w-32 h-auto mb-6 rounded-full shadow-lg" />
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md">
          Barangay Portal
        </h1>
        <p className="text-gray-200 text-lg">
          Secure access for residents and staff
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div
        className="flex-1 flex items-center justify-center p-10"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-900 mb-2 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-900 mb-2 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-semibold shadow-md"
              style={{ backgroundColor: '#6C7B74' }} // Solid fixed background
            >
              Login
            </button>
          </form>

          {message && (
            <p className="text-sm text-red-500 text-center mt-4">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
