import React, { useEffect, useState } from "react";
import axios from "axios";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ GET CURRENT USER (SAFE)
  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // ================= FETCH LOGS =================
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);

      try {
        const user = getCurrentUser();

        const res = await axios.get(`${API_URL}/api/activity`, {
          headers: {
            // optional but useful for future filtering/security
            "x-username": user?.username || "SYSTEM",
          },
        });

        setLogs(res.data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // ================= SEARCH FILTER =================
  const filtered = logs.filter((log) =>
    `${log.CREATED_AT} ${log.USERNAME} ${log.ACTION}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ================= PAGINATION =================
  const logsPerPage = 5;
  const totalPages = Math.ceil(filtered.length / logsPerPage);

  const indexOfLast = currentPage * logsPerPage;
  const indexOfFirst = indexOfLast - logsPerPage;
  const currentLogs = filtered.slice(indexOfFirst, indexOfLast);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white text-gray-800 font-poppins">
      
      {/* AppBar */}
      <CustomAppBar title="Activity Log" />

      {/* SEARCH */}
      <div className="flex justify-between items-center mt-8 px-6">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search activity..."
            className="w-full pl-12 pr-10 py-2 rounded-full border border-gray-200 shadow focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              ✖
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-gray-600">Loading activity logs...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg mt-8 mx-6">
            <table className="w-full text-sm">
              <thead className="bg-cyan-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-left">User</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {currentLogs.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-cyan-50 even:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 border-b">
                      {log.CREATED_AT
                        ? new Date(log.CREATED_AT).toLocaleString()
                        : "N/A"}
                    </td>

                    <td className="px-6 py-4 border-b font-medium text-gray-700">
                      {log.USERNAME}
                    </td>

                    <td className="px-6 py-4 border-b text-gray-600">
                      {log.ACTION}
                    </td>
                  </tr>
                ))}

                {currentLogs.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">
                      No activity found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex justify-end items-center gap-4 mt-8 px-6">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${
                currentPage === 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-cyan-700 text-white hover:bg-cyan-800"
              }`}
            >
              ← Prev
            </button>

            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </p>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${
                currentPage === totalPages || totalPages === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-cyan-700 text-white hover:bg-cyan-800"
              }`}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ActivityLog;