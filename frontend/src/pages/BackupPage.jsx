import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";

function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [backups, setBackups] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [uploading, setUploading] = useState(false);

  const API_URL = "http://localhost:5000/api/backup";

  // Fetch backup files
  const fetchBackups = async () => {
    try {
      const res = await axios.get(`${API_URL}/list`);
      setBackups(res.data.files || []);
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Create backup
  const triggerBackup = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.get(`${API_URL}/export`);

      setMessage(
        `✅ ${res.data.message}\nFile: ${res.data.file}`
      );

      fetchBackups();
    } catch (err) {
      console.error(err);

      setMessage(
        "❌ Backup failed: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Import selected backup
  const importBackup = async () => {
    if (!selectedFile) {
      setMessage("❌ Please select a JSON backup file");
      return;
    }

    const confirmImport = window.confirm(
      "This will overwrite current database data. Continue?"
    );

    if (!confirmImport) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        `${API_URL}/import`,
        {
          filename: selectedFile,
        }
      );

      setMessage(`✅ ${res.data.message}`);
    } catch (err) {
      console.error(err);

      setMessage(
        "❌ Import failed: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Upload JSON backup
  const uploadImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setMessage("❌ Only JSON backup files are allowed.");
      return;
    }

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("backup", file);

    try {
      const res = await axios.post(
        `${API_URL}/upload-import`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setMessage(
        `✅ ${res.data.message}: ${res.data.filename}`
      );

      setSelectedFile(res.data.filename);

      fetchBackups();
    } catch (err) {
      console.error(err);

      setMessage(
        "❌ Upload failed: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-4 rounded-full">
              <CloudArrowUpIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">
            Database Backup Manager
          </h1>

          <p className="text-gray-400 mt-2 text-sm">
            Export and restore full system backups using
            JSON files.
          </p>
        </div>

        {/* Export */}
        <button
          onClick={triggerBackup}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition mb-6 disabled:opacity-50"
        >
          {loading
            ? "Creating Backup..."
            : "Create Backup"}
        </button>

        {/* Existing backups */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 text-sm">
            Restore Existing Backup
          </label>

          <div className="flex gap-2">
            <select
              value={selectedFile}
              onChange={(e) =>
                setSelectedFile(e.target.value)
              }
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="">
                Select JSON backup file
              </option>

              {backups.map((file, index) => (
                <option key={index} value={file}>
                  {file}
                </option>
              ))}
            </select>

            <button
              onClick={importBackup}
              disabled={!selectedFile || loading}
              className="bg-green-600 hover:bg-green-700 px-4 rounded-lg text-white disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </div>

        {/* Upload JSON */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2 text-sm">
            Upload JSON Backup File
          </label>

          <input
            type="file"
            accept=".json"
            onChange={uploadImport}
            disabled={uploading}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-700 cursor-pointer"
          />
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-6 p-3 rounded-lg text-sm whitespace-pre-line ${
              message.startsWith("❌")
                ? "bg-red-900/30 text-red-400 border border-red-500/30"
                : "bg-green-900/30 text-green-400 border border-green-500/30"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupPage;