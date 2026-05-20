import React, { useEffect, useState } from "react";
import axios from "axios";

function AnnouncementsTable() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load announcements
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        "http://localhost:5000/api/announcements"
      );
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch announcements:", error.message);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Format ISO date
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
  };

  // Resend announcement
  const resendAnnouncement = async (id) => {
    const confirmResend = window.confirm(
      "Do you want to resend this announcement?"
    );
    if (!confirmResend) return;

    try {
      const { data } = await axios.post(
        `http://localhost:5000/api/announcements/resend/${id}`
      );
      alert(
        `✅ Announcement resent successfully!\nSMS sent: ${data.smsSent}\nFCM sent: ${data.fcmSent}`
      );
    } catch (err) {
      console.error("Resend failed:", err);
      alert("❌ Failed to resend announcement");
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this announcement?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:5000/api/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      alert("🗑️ Announcement deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Failed to delete announcement");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-teal-600 flex items-center gap-2">
        📢 Announcements
      </h1>

      <div className="overflow-x-auto bg-white rounded-lg shadow border">
        <table className="min-w-full border-collapse">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="p-3 text-left w-12">#</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Message</th>
              <th className="p-3 text-left w-56">Where / When</th>
              <th className="p-3 text-left w-40">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : announcements.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No announcements yet
                </td>
              </tr>
            ) : (
              announcements.map((a, index) => (
                <tr
                  key={a.id ?? index}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-semibold">{a.title}</td>
                  <td className="p-3 whitespace-pre-wrap">{a.what}</td>
                  <td className="p-3">
                    <div className="text-gray-700">{a.where}</div>
                    <div className="text-gray-500 text-sm">{formatDate(a.when)}</div>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => resendAnnouncement(a.id)}
                      className="bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700 transition flex-1"
                    >
                      🔁 Resend
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition flex-1"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnnouncementsTable;