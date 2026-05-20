import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

function PurokResidents() {
  const { purok } = useParams();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purokImage, setPurokImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Fetch residents
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/api/residents`);
        const filtered = res.data.filter((r) => r.purok === purok);
        setResidents(filtered);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch residents.");
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, [purok]);

  // Fetch Purok image
  useEffect(() => {
    const fetchPurokImage = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/residents/purok/${encodeURIComponent(purok)}/image`);
        setPurokImage(res.data.imageUrl);
      } catch {
        setPurokImage(null);
      }
    };
    fetchPurokImage();
  }, [purok]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      const res = await axios.post(
        `${API_URL}/api/residents/purok/${encodeURIComponent(purok)}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPurokImage(res.data.imageUrl);
      alert("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const calculateAge = (birth_date) => {
    if (!birth_date) return "-";
    const birth = new Date(birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getFullName = (r) => {
    return [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ");
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#F6F7F3] via-white to-[#EEF1E9] font-poppins">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#6F7E55]">Residents in {purok}</h1>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-[#89986D] text-white rounded-lg hover:bg-[#6F7E55] transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Purok Image Upload */}
      <div className="mb-6 flex flex-col items-center">
        {purokImage ? (
          <img
            src={purokImage}
            alt={`${purok} Map`}
            className="w-full max-w-md rounded border mb-3"
          />
        ) : (
          <div className="w-full max-w-md h-48 border rounded flex items-center justify-center text-gray-400 mb-3">
            No Purok Image
          </div>
        )}
        <label className="cursor-pointer px-4 py-2 bg-[#89986D] text-white rounded-lg hover:bg-[#6F7E55] transition">
          {uploading ? "Uploading..." : "Upload / Change Purok Image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {/* Residents Table */}
      {loading ? (
        <p className="text-gray-600">Loading residents...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : residents.length === 0 ? (
        <p className="text-gray-600 italic">No residents found in this Purok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white border border-gray-200 rounded-xl shadow-md">
            <thead className="bg-[#89986D] text-white">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Full Name</th>
                <th className="p-3 text-left">Age</th>
                <th className="p-3 text-left">Gender</th>
                <th className="p-3 text-left">Address</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((r, i) => (
                <tr
                  key={r.resident_id || i}
                  className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{getFullName(r)}</td>
                  <td className="p-3">{calculateAge(r.birth_date)}</td>
                  <td className="p-3">{r.gender || "-"}</td>
                  <td className="p-3">{r.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PurokResidents;
