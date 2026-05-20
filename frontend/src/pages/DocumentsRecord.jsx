// src/pages/DocumentsRecord.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArchiveBoxIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function DocumentsRecord() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchDocuments = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/documents?status=approve`);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = documents.filter((doc) =>
    `${doc.RESIDENT} ${doc.DATE_GENERATED} ${doc.FILE_TYPE}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const docsPerPage = 5;
  const totalPages = Math.ceil(filtered.length / docsPerPage) || 1;
  const indexOfLast = currentPage * docsPerPage;
  const indexOfFirst = indexOfLast - docsPerPage;
  const currentDocs = filtered.slice(indexOfFirst, indexOfLast);

  const goToNextPage = () =>
    currentPage < totalPages && setCurrentPage((prev) => prev + 1);

  const goToPrevPage = () =>
    currentPage > 1 && setCurrentPage((prev) => prev - 1);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#F5F5EC] to-white text-gray-800 font-poppins">
      <CustomAppBar title="Approved Documents" icon={ArchiveBoxIcon} />

      {/* Search Bar */}
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="w-12 h-12 border-4 border-[#89986D] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-gray-600">Loading documents...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg mt-8 mx-6">
            <table className="w-full text-sm">
              <thead className="bg-[#89986D] text-white">
                <tr>
                  <th className="px-6 py-4 text-left">#</th>
                  <th className="px-6 py-4 text-left">Resident</th>
                  <th className="px-6 py-4 text-left">Date Issued</th>
                  <th className="px-6 py-4 text-left">File Type</th>
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
                    <td className="px-6 py-4 border-b">{doc.DATE_GENERATED}</td>
                    <td className="px-6 py-4 border-b">
                      {doc.FILE_TYPE || "N/A"}
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
                    </td>
                  </tr>
                ))}

                {currentDocs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-500">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > docsPerPage && (
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
          )}
        </>
      )}
    </div>
  );
}

export default DocumentsRecord;