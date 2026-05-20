import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlusIcon, ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';

function AddResident() {
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
    civil_status: '',
    purok: '',
    email: '',
    phone_number: '',
  });

  // ✅ Hardcoded Purok list
  const [puroks] = useState([
    'Purok Maligaya',
    'Purok Pag-asa',
    'Purok Matahimik',
    'Purok Masagana',
    'Purok Bagong Silang',
    'Purok Pagkakaisa',
    'Sitio Canduyog',
    'Sitio Crossing',
    'Sitio Tamalarong',
    'Sitio Pinangupitan',
    'Sitio Binatuan',
    'Sitio Tula-tulahan'
  ]);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Compute max date for birth_date input (18+)
  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const maxBirthDate = eighteenYearsAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🟢 Age validation
    const birthDateObj = new Date(form.birth_date);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }

    if (age < 18) {
      alert('Resident must be at least 18 years old.');
      return;
    }

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => formData.append(key, form[key]));
      if (image) formData.append('profile_image', image);

      await axios.post(`${process.env.REACT_APP_API_URL}/api/residents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowSuccess(true);
      setTimeout(() => navigate('/residents'), 2000);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.response?.data?.message || '❌ Failed to save resident.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white text-gray-800 font-poppins">
      {/* Banner */}
      <div className="bg-cyan-700 text-white py-6 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <UserPlusIcon className="w-10 h-10" />
          <h2 className="text-2xl font-bold tracking-wide">Add New Resident</h2>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white text-cyan-700 px-4 py-2 rounded-lg shadow hover:bg-cyan-50 transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>
      </div>

      {/* Form */}
      <div className="bg-white p-10 rounded-2xl shadow-lg max-w-4xl mx-auto mt-10 border border-gray-100">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <h3 className="col-span-full text-lg font-semibold text-cyan-700 border-b pb-2">
            Personal Information
          </h3>

          <input
            type="text"
            name="first_name"
            placeholder="First Name"
            value={form.first_name}
            onChange={handleChange}
            required
            className="input-field"
          />
          <input
            type="text"
            name="middle_name"
            placeholder="Middle Name"
            value={form.middle_name}
            onChange={handleChange}
            className="input-field"
          />
          <input
            type="text"
            name="last_name"
            placeholder="Last Name"
            value={form.last_name}
            onChange={handleChange}
            required
            className="input-field"
          />
          <input
            type="date"
            name="birth_date"
            value={form.birth_date}
            onChange={handleChange}
            required
            max={maxBirthDate}
            className="input-field"
          />

          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
          </select>

          <select
            name="civil_status"
            value={form.civil_status}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="">Select Civil Status</option>
            <option>Single</option>
            <option>Married</option>
            <option>Widowed</option>
            <option>Separated</option>
          </select>

          {/* Purok Dropdown */}
          <select
            name="purok"
            value={form.purok}
            onChange={handleChange}
            required
            className="input-field sm:col-span-2"
          >
            <option value="">Select Purok</option>
            {puroks.map((p, idx) => (
              <option key={idx} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="input-field sm:col-span-2"
          />
          <input
            type="tel"
            name="phone_number"
            placeholder="Phone Number"
            value={form.phone_number}
            onChange={handleChange}
            required
            className="input-field sm:col-span-2"
          />

          <h3 className="col-span-full text-lg font-semibold text-cyan-700 border-b pb-2 mt-4">
            Profile Picture
          </h3>
          <div className="sm:col-span-2 flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:border-cyan-500 transition">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-40 h-40 object-cover rounded-lg shadow-md border-4 border-white"
              />
            ) : (
              <PhotoIcon className="w-16 h-16 text-gray-400 mb-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-3 block w-full text-sm text-gray-600"
            />
          </div>

          <button
            type="submit"
            className="col-span-full py-3 bg-cyan-700 hover:bg-cyan-800 text-white font-medium rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            Save Resident
          </button>
        </form>

        {errorMessage && <p className="mt-4 text-center text-sm text-red-500">{errorMessage}</p>}
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-fade-in scale-100">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl">
                ✔
              </div>
            </div>
            <h3 className="text-xl font-semibold text-green-700 mb-2">Success!</h3>
            <p className="text-gray-600">Resident has been added successfully.</p>
          </div>
        </div>
      )}

      <style>{`
        .input-field {
          @apply w-full px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default AddResident;
