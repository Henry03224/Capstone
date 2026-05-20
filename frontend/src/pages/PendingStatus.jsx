import React, { useEffect, useState } from "react";
import axios from "axios";
import CustomAppBar from "../components/CustomAppBar";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

function PendingStatus() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/documents?status=pending`);
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching pending documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // ---------------------------------------------
  // UPDATED: handleApprove with Confirmation Input
  // ---------------------------------------------
  const handleApprove = async (id) => {
    // 1. Humingi ng input mula sa user
    const userInput = window.prompt("Type 'approve' to confirm this action:");

    // 2. Check kung tama ang tinype
    if (userInput !== "approve") {
      if (userInput !== null) { // Kung hindi naman kinancel (null), mag-alert ng error
        alert("Incorrect confirmation text. Action cancelled.");
      }
      return; // Itigil ang function dito
    }

    // 3. Kung tama ang input, ituloy ang API call
    try {
      setApprovingId(id);
      await axios.patch(`${API_URL}/api/documents/status/${id}`);
      alert("Document approved successfully!");
      fetchPending(); // Refresh list after approval
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Failed to approve document.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-cyan-50 to-white font-poppins text-gray-800">
      <CustomAppBar title="Pending Documents" icon={DocumentTextIcon} />
      <div className="mt-8 px-6">
        {loading ? (
          <div className="w-full flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : documents.length === 0 ? (
          <p className="text-gray-600 text-lg text-center mt-8">
            No pending documents available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse shadow-lg rounded-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">#</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Resident</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Date Issued</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">File Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc, index) => (
                  <tr key={doc.ID} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.RESIDENT}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.DATE_GENERATED}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.FILE_TYPE || "N/A"}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <a
                        href={`${API_URL}${doc.FILE_PATH}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
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
                        onClick={() => handleApprove(doc.ID)}
                        disabled={approvingId === doc.ID}
                        className={`px-3 py-1 text-white rounded-md transition ${
                          approvingId === doc.ID
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }`}
                      >
                        {approvingId === doc.ID ? "Approving..." : "Approve"}
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

export default PendingStatus;