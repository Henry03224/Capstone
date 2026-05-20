import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import barangayLogo from '../assets/barangay-logo.png';

function Register() {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');

  // Step 2 fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('Captain');

  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        firstName,
        middleName,
        lastName,
        suffix,
        username,
        password,
        position,
      });
      navigate('/login');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="flex h-screen font-poppins bg-gray-100">
      {/* Left */}
      <div className="w-1/2 bg-gradient-to-br from-[#2e3a59] to-[#4e5d6c] flex justify-center items-center p-10">
        <img
          src={barangayLogo}
          alt="Barangay Logo"
          className="w-[70%] max-w-[280px] rounded-xl shadow-lg"
        />
      </div>

      {/* Right */}
      <div className="w-1/2 flex justify-center items-center p-10 overflow-y-auto">
        <div className="w-full max-w-md p-9 bg-white rounded-2xl shadow-xl">
          <h2 className="text-center mb-8 text-3xl font-semibold text-[#2e3a59]">
            Barangay Registration
          </h2>

          <form onSubmit={handleRegister}>
            {step === 1 && (
              <>
                {/* First Name */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Middle Name */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Last Name */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Suffix */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Suffix
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-yellow-500 text-white font-semibold text-base rounded-xl hover:bg-yellow-600"
                >
                  Next
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Username */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Password */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Position */}
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-600">
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="Captain">Captain</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-[48%] py-3 bg-gray-400 text-white font-semibold text-base rounded-xl hover:bg-gray-500"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-[48%] py-3 bg-yellow-500 text-white font-semibold text-base rounded-xl hover:bg-yellow-600"
                  >
                    Register
                  </button>
                </div>
              </>
            )}
          </form>

          {message && (
            <p className="text-red-500 text-sm mt-4 text-center">{message}</p>
          )}

          <p className="mt-6 text-sm text-gray-600 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-yellow-500 font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
