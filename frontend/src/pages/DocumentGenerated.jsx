// src/pages/DocumentGenerated.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function DocumentGenerated() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API_URL}/api/documents-generated?status=${statusFilter}`
        : `${API_URL}/api/documents-generated`;

      const response = await axios.get(url);
      setDocuments(response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  // 🔥 UPDATED DELETE (TYPE CONFIRM)
  const handleDelete = async (id) => {
    const userInput = window.prompt("Type CONFIRM to delete this document:");

    if (!userInput || userInput.trim().toUpperCase() !== "CONFIRM") {
      alert("Deletion cancelled. You must type CONFIRM.");
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/documents-generated/${id}`);
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const filtered = documents.filter((doc) =>
    `${doc.RESIDENT} ${doc.FILE_TYPE} ${doc.STATUS}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Pagination
  const docsPerPage = 5;
  const totalPages = Math.ceil(filtered.length / docsPerPage) || 1;
  const indexOfLast = currentPage * docsPerPage;
  const indexOfFirst = indexOfLast - docsPerPage;
  const currentDocs = filtered.slice(indexOfFirst, indexOfLast);

  const goToNextPage = () =>
    currentPage < totalPages && setCurrentPage((prev) => prev + 1);
  const goToPrevPage = () =>
    currentPage > 1 && setCurrentPage((prev) => prev - 1);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500 text-lg">
        Loading generated documents...
      </div>
    );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#F5F5EC] to-white text-gray-800 font-poppins">
      <CustomAppBar title="Generated Documents" />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-8 px-6 gap-4">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents..."
            className="w-full pl-12 pr-10 py-2 rounded-full border border-gray-200 shadow focus:ring-2 focus:ring-[#89986D] focus:outline-none text-sm transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✖
            </button>
          )}
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#89986D] text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approve">Approve</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <p className="text-gray-600 text-lg mt-10 px-6">
          No generated documents available.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg mt-8 mx-6">
            <table className="w-full text-sm">
              <thead className="bg-[#89986D] text-white">
                <tr>
                  <th className="px-6 py-4 text-left">#</th>
                  <th className="px-6 py-4 text-left">Resident</th>
                  <th className="px-6 py-4 text-left">Date Generated</th>
                  <th className="px-6 py-4 text-left">File Type</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDocs.map((doc, index) => (
                  <tr
                    key={doc.ID}
                    className="hover:bg-[#E2E5D9] even:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 border-b">
                      {indexOfFirst + index + 1}
                    </td>
                    <td className="px-6 py-4 border-b">{doc.RESIDENT}</td>
                    <td className="px-6 py-4 border-b">
                      {formatDateTime(doc.DATE_GENERATED)}
                    </td>
                    <td className="px-6 py-4 border-b">
                      {doc.FILE_TYPE || "N/A"}
                    </td>
                    <td
                      className={`px-6 py-4 border-b font-medium ${
                        doc.STATUS === "Approve"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {doc.STATUS}
                    </td>
                    <td className="px-6 py-4 border-b flex gap-2">
                      <a
                        href={`${API_URL}${doc.FILE_PATH}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#89986D] text-white rounded-md hover:bg-[#7C8762] transition"
                      >
                        View
                      </a>
                      <a
                        href={`${API_URL}${doc.FILE_PATH}`}
                        download
                        className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(doc.ID)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {currentDocs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-500">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center gap-4 mt-8 px-6">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-[#89986D] text-white hover:bg-[#7C8762]"
              }`}
            >
              ← Prev
            </button>

            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === totalPages
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-[#89986D] text-white hover:bg-[#7C8762]"
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

export default DocumentGenerated;