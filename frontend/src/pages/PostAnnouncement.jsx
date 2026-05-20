import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function PostAnnouncement() {
  const [title, setTitle] = useState("");
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState(""); // Holds the raw date-time value

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Helper to format date for SMS readability
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'long', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      hour12: true
    }); 
    // Result: "October 24, 2023 at 2:00 PM"
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Format the date before sending to API so the SMS looks good
      const formattedWhen = formatDateTime(when);

      await axios.post("http://localhost:5000/api/announcements", {
        title,
        what,
        where,
        when: formattedWhen, // Send the readable version
      });

      setSuccess("✅ Announcement posted and SMS sent to all residents!");
      
      // Reset forms
      setTitle("");
      setWhat("");
      setWhere("");
      setWhen("");
    } catch (err) {
      console.error(err);
      setError("❌ Failed to post announcement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
      {/* Header + View Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          📢 Post Announcement
        </h1>
        <Link
          to="/announcements"
          className="mt-4 md:mt-0 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow-md transition"
        >
          📄 View Announcements
        </Link>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 rounded mb-6 shadow-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6 shadow-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Title (Heading)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Community Assembly"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
          />
        </div>

        {/* WHAT */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">📝 What (Details)</label>
          <textarea
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            required
            rows={4}
            placeholder="Describe the event or announcement..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none transition resize-none"
          />
        </div>

        {/* WHERE & WHEN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">📍 Where (Location)</label>
            <input
              type="text"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              required
              placeholder="e.g. Barangay Hall, Zone 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
            />
          </div>
          
          {/* 🟢 UPDATED TO DATEPICKER */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">⏰ When (Date & Time)</label>
            <input
              type="datetime-local"  // <-- Changed from text
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none transition cursor-pointer"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition disabled:opacity-50"
        >
          {loading ? "Sending..." : "📢 Post Announcement"}
        </button>
      </form>
    </div>
  );
}

export default PostAnnouncement;