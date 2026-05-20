import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { UserCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import CustomAppBar from '../components/CustomAppBar';

function EditResident() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');

  const [formData, setFormData] = useState({
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
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchResident = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/residents/${id}`
        );
        setFormData(response.data);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message || '❌ Unable to load resident data.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchResident();
    else {
      setErrorMessage('❌ Invalid profile ID.');
      setLoading(false);
    }
  }, [id]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => setProfileImage(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formPayload = new FormData();
      for (let key in formData) {
        formPayload.append(key, formData[key]);
      }
      if (profileImage) {
        formPayload.append('profile_image', profileImage);
      }

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/residents/${id}`,
        formPayload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      navigate(`/resident-profile?id=${id}`);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || '❌ Failed to update resident.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white text-gray-800 font-poppins">
      <CustomAppBar title="Edit Resident" icon={UserCircleIcon} showBack />

      <div className="mt-8 px-6">
        {errorMessage && (
          <div className="mb-6 text-center bg-red-100 border border-red-300 text-red-600 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200 space-y-8"
        >
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-4">
            <img
              src={
                profileImage
                  ? URL.createObjectURL(profileImage)
                  : formData.profile_image
                  ? `${process.env.REACT_APP_API_URL}${formData.profile_image}`
                  : '/default-profile.png'
              }
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-cyan-600 shadow-md"
            />
            <label className="cursor-pointer flex items-center gap-2 bg-cyan-700 hover:bg-cyan-800 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-md transition-all">
              <PhotoIcon className="w-5 h-5" /> Change Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TextInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} />
            <TextInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
            <TextInput label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} />
            <TextInput label="Birth Date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
            <SelectInput label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} />
            <SelectInput label="Civil Status" name="civil_status" value={formData.civil_status} onChange={handleChange} options={['Single', 'Married', 'Widowed', 'Separated']} />
            <TextInput label="Purok" name="purok" value={formData.purok} onChange={handleChange} />
            <TextInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
            <TextInput label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(`/resident-profile?id=${id}`)}
              className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium shadow-md transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-sm font-medium shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TextInput = ({ label, name, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      className="w-full pl-3 pr-3 py-2 rounded-lg border border-gray-300 shadow focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm transition"
    />
  </div>
);

const SelectInput = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      className="w-full pl-3 pr-3 py-2 rounded-lg border border-gray-300 shadow focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm transition"
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

export default EditResident;
