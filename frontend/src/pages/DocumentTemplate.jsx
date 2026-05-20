// src/pages/DocumentTemplate.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DocumentArrowUpIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function DocumentTemplate() {
  const { templateType } = useParams();
  const [templates, setTemplates] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/templates?type=${templateType}`);
      const data = await res.json();
      setTemplates(data || []);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [templateType]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file first");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("templateType", templateType);

    try {
      const res = await fetch(`${API_URL}/api/templates/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        alert("✅ Uploaded successfully!");
        setFile(null);
        loadTemplates();
      } else {
        alert("❌ Upload failed: " + data.message);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`${API_URL}/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        alert("🗑️ Template deleted!");
        loadTemplates();
      } else {
        alert("❌ Delete failed: " + data.message);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Delete failed!");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#F5F5EC] to-white text-gray-800 font-poppins">
      <CustomAppBar title={`${templateType || "General"} Templates`} icon={DocumentTextIcon} />

      <div className="px-6 mt-8">
        <form
          onSubmit={handleUpload}
          className="flex flex-col sm:flex-row items-center gap-3 bg-white p-5 rounded-xl shadow-md border border-gray-200"
        >
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full sm:w-auto flex-1 border border-gray-300 rounded-lg p-2 text-sm"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#89986D] hover:bg-[#7C8762] text-white px-5 py-2 rounded-lg text-sm font-medium shadow transition-all"
          >
            <DocumentArrowUpIcon className="w-5 h-5" />
            Upload
          </button>
        </form>

        <div className="mt-6 bg-white rounded-xl shadow-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#89986D] text-white">
              <tr>
                <th className="px-6 py-3 text-left">Filename</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="2" className="text-center py-6 text-gray-500">
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length > 0 ? (
                templates.map((t) => (
                  <tr key={t.id} className="hover:bg-[#E2E5D9] transition even:bg-gray-50">
                    <td className="px-6 py-4 border-b">
                      <a
                        href={`${API_URL}${t.location}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#89986D] hover:underline"
                      >
                        {t.filename}
                      </a>
                    </td>
                    <td className="px-6 py-4 border-b">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs shadow transition"
                      >
                        <TrashIcon className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-center py-6 text-gray-500">
                    No templates uploaded for this type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DocumentTemplate;
