import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  UserCircleIcon,
  CakeIcon,
  UserIcon,
  IdentificationIcon,
  HomeIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import CustomAppBar from '../components/CustomAppBar';

function ResidentProfile() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');

  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchResident = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/residents/${id}`
        );
        setResident(response.data);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.response?.data?.message || '❌ Profile not found.');
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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600 text-sm">Loading resident profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white text-gray-800 font-poppins overflow-y-auto">
      {/* Reusable AppBar with custom actions */}
      <CustomAppBar
        title="Resident Profile"
        icon={UserCircleIcon}
        actions={
          <button
            onClick={() => navigate(`/edit-resident?id=${id}`)}
            className="bg-yellow-400 text-white px-3 py-1.5 rounded-md shadow hover:bg-yellow-500 transition flex items-center gap-1"
          >
            <PencilSquareIcon className="w-5 h-5" /> Edit
          </button>
        }
      />

      {errorMessage ? (
        <p className="text-center text-red-500 font-medium mt-6">{errorMessage}</p>
      ) : (
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mt-6">
          {/* Accent top border */}
          <div className="h-2 bg-cyan-700"></div>

          <div className="p-10 flex flex-col lg:flex-row items-center lg:items-start gap-10">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <img
                src={
                  resident.profile_image
                    ? `${process.env.REACT_APP_API_URL}${resident.profile_image}`
                    : '/default-profile.png'
                }
                alt="Profile"
                className="w-48 h-48 object-cover border-4 border-cyan-600 shadow-lg rounded-lg"
              />
            </div>

            {/* Info Section */}
            <div className="flex-1 text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {`${resident.first_name} ${
                  resident.middle_name ? resident.middle_name + ' ' : ''
                }${resident.last_name}`}
              </h1>

              {/* Barangay + Purok */}
              <p className="text-lg text-gray-500 mb-6 flex items-center gap-2">
                <HomeIcon className="w-5 h-5 text-cyan-600" />
                Resident of Barangay {resident.barangay}, Purok {resident.purok}
              </p>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-12 text-gray-700">
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="First Name"
                  value={resident.first_name}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Middle Name"
                  value={resident.middle_name || '—'}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Last Name"
                  value={resident.last_name}
                />
                <InfoItem
                  icon={<CakeIcon className="w-5 h-5 text-cyan-600" />}
                  label="Birth Date"
                  value={resident.birth_date}
                />
                <InfoItem
                  icon={<IdentificationIcon className="w-5 h-5 text-cyan-600" />}
                  label="Age"
                  value={`${calculateAge(resident.birth_date)} years old`}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Gender"
                  value={resident.gender}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Civil Status"
                  value={resident.civil_status}
                />
                <InfoItem
                  icon={<HomeIcon className="w-5 h-5 text-cyan-600" />}
                  label="Barangay"
                  value={resident.barangay}
                />
                <InfoItem
                  icon={<HomeIcon className="w-5 h-5 text-cyan-600" />}
                  label="Purok"
                  value={resident.purok}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Email"
                  value={resident.email || '—'}
                />
                <InfoItem
                  icon={<UserIcon className="w-5 h-5 text-cyan-600" />}
                  label="Phone Number"
                  value={resident.phone_number || '—'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    {icon}
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

export default ResidentProfile;
