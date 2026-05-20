import React, { useState } from "react";
import axios from "axios";

function AccountRegistration() {
  const [step, setStep] = useState(1);

  // Step 1: Name info
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  // Step 2: Account info
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState("Captain");

  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

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

      setMessage("Registration successful! You can now login.");
      setStep(1);

      // reset fields
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setUsername("");
      setPassword("");
      setPosition("Captain");
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-center text-2xl font-semibold text-gray-800 mb-6">
          Account Registration
        </h2>

        <form onSubmit={handleRegister}>
          {step === 1 && (
            <>
              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Suffix</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-600">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
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
                  className="w-[48%] py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-[48%] py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Register
                </button>
              </div>
            </>
          )}
        </form>

        {message && (
          <p className="mt-4 text-center text-red-500 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}

export default AccountRegistration;
