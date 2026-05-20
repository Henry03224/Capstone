import React, { useEffect, useState } from "react";
import axios from "axios";
import CustomAppBar from '../components/CustomAppBar'; // Optional: If you use the app bar here
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

function PastResidents() {
  const [archivedResidents, setArchivedResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch archived residents from backend
  const fetchArchivedResidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/residents/archived`
      );
      setArchivedResidents(response.data);
    } catch (err) {
      console.error("Failed to fetch archived residents:", err);
      setError("Failed to fetch archived residents.");
      setArchivedResidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedResidents();
  }, []);

  // Restore resident back to Oracle
  const restoreResident = async (resident_id) => {
    if (!window.confirm("Are you sure you want to restore this resident?")) return;
    setRestoringId(resident_id);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/residents/restore/${resident_id}`
      );
      alert("Resident restored successfully!");
      fetchArchivedResidents(); // refresh list
    } catch (err) {
      console.error("Failed to restore resident:", err);
      alert("Failed to restore resident.");
    } finally {
      setRestoringId(null);
    }
  };

  // Permanently delete archived resident
  const deleteResident = async (resident_id) => {
    if (!window.confirm("This will PERMANENTLY delete the record. Are you sure?")) return;
    setDeletingId(resident_id);
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/residents/archived/${resident_id}`
      );
      alert("Archived resident deleted permanently!");
      fetchArchivedResidents(); // refresh list
    } catch (err) {
      console.error("Failed to delete archived resident:", err);
      alert("Failed to delete archived resident.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-800 font-poppins">
      {/* Optional Header if you want to match other pages */}
      <div className="bg-white shadow-sm py-4 px-6 flex items-center gap-3 mb-6">
         <ArchiveBoxIcon className="w-6 h-6 text-gray-600" />
         <h1 className="text-xl font-bold text-gray-700">Archived Residents</h1>
      </div>

      <div className="px-6 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600">Loading archived residents...</p>
          </div>
        ) : error ? (
          <p className="text-red-600 text-center mt-10">{error}</p>
        ) : archivedResidents.length === 0 ? (
          <div className="text-center mt-20 text-gray-500">
            <ArchiveBoxIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No archived residents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-cyan-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Profile</th>
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">Reason</th> {/* ADDED */}
                  <th className="px-6 py-4 text-left">Date Archived</th> {/* ADDED */}
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedResidents.map((resident) => (
                  <tr
                    key={resident.resident_id}
                    className="hover:bg-cyan-50 even:bg-gray-50 transition border-b border-gray-100 last:border-0"
                  >
                    {/* Profile Image */}
                    <td className="px-6 py-4">
                      {resident.profile_image ? (
                        <img
                          src={`${process.env.REACT_APP_API_URL}${resident.profile_image}`}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                          N/A
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {resident.first_name} {resident.middle_name || ""} {resident.last_name}
                    </td>

                    {/* Reason (NEW) */}
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold border border-yellow-200">
                        {resident.archive_reason || "Unspecified"}
                      </span>
                    </td>

                    {/* Archived Date (NEW) */}
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(resident.archived_at).toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => restoreResident(resident.resident_id)}
                        disabled={restoringId === resident.resident_id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs shadow-sm transition"
                      >
                        {restoringId === resident.resident_id ? "Restoring..." : "Restore"}
                      </button>

                      <button
                        onClick={() => deleteResident(resident.resident_id)}
                        disabled={deletingId === resident.resident_id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs shadow-sm transition"
                      >
                        {deletingId === resident.resident_id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PastResidents;