import React, { useEffect, useState } from "react";
import axios from "axios";

const defaultIcon = "https://cdn-icons-png.flaticon.com/512/194/194938.png";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function OfficialsPage() {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("current");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState(null);
  const [form, setForm] = useState({
    name: "",
    position: "",
    contact: "",
    term_year: new Date().getFullYear(),
    imageFile: null,
    imagePreview: "",
  });

  // --------------------------
  // Fetch Officials
  // --------------------------
  const fetchOfficials = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/officials`);
      if (!Array.isArray(data)) throw new Error("Invalid data format");
      setOfficials(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load officials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficials();
  }, []);

  // --------------------------
  // Modal handlers
  // --------------------------
  const openAddModal = () => {
    setEditingOfficial(null);
    setForm({
      name: "",
      position: "",
      contact: "",
      imageFile: null,
      imagePreview: "",
      term_year: new Date().getFullYear(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (official) => {
    setEditingOfficial(official);
    setForm({
      name: official.NAME || "",
      position: official.POSITION || "",
      contact: official.CONTACT || "",
      term_year: official.TERM_YEAR || new Date().getFullYear(),
      imageFile: null,
      imagePreview: official.IMAGE_URL ? `${API_URL}${official.IMAGE_URL}` : "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    if (form.imagePreview && form.imageFile) URL.revokeObjectURL(form.imagePreview);
    setIsModalOpen(false);
    setEditingOfficial(null);
    setForm({
      name: "",
      position: "",
      contact: "",
      term_year: new Date().getFullYear(),
      imageFile: null,
      imagePreview: "",
    });
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return setForm((prev) => ({ ...prev, imageFile: null, imagePreview: "" }));
    const previewUrl = URL.createObjectURL(file);
    if (form.imagePreview && form.imageFile) URL.revokeObjectURL(form.imagePreview);
    setForm((prev) => ({ ...prev, imageFile: file, imagePreview: previewUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.position.trim()) return alert("Name & Position are required");
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("position", form.position);
      fd.append("contact", form.contact || "");
      fd.append("term_year", form.term_year);
      if (form.imageFile) fd.append("image", form.imageFile);

      if (editingOfficial) {
        await axios.put(`${API_URL}/api/officials/${editingOfficial.ID}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await axios.post(`${API_URL}/api/officials`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }

      await fetchOfficials();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Failed to save official");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (official) => {
    if (!window.confirm(`Delete ${official.NAME}?`)) return;
    try {
      await axios.delete(`${API_URL}/api/officials/${official.ID}`);
      fetchOfficials();
    } catch (err) {
      console.error(err);
      alert("Failed to delete official");
    }
  };

  const startNewYear = async () => {
    const nextYear = new Date().getFullYear() + 1;

    // Prevent starting a year that already exists
    const existingYears = officials.map((o) => o.TERM_YEAR);
    if (existingYears.includes(nextYear)) {
      return alert(`Term ${nextYear} already exists.`);
    }

    if (!window.confirm(`Start new term for ${nextYear}? Current officials will become previous.`)) return;

    try {
      await axios.post(`${API_URL}/api/officials/start-new-year`, { term_year: nextYear });
      await fetchOfficials();
      alert(`New term ${nextYear} started.`);
    } catch (err) {
      console.error(err);
      alert("Failed to start new year");
    }
  };

  // --------------------------
  // Filter Officials
  // --------------------------
  const currentOfficials = officials.filter((o) => o.STATUS === "ACTIVE") || [];
  const previousOfficials = officials.filter((o) => o.STATUS === "PREVIOUS") || [];

  const groupedPrevious = previousOfficials.reduce((acc, o) => {
    const year = o.TERM_YEAR || "Unknown";
    if (!acc[year]) acc[year] = [];
    acc[year].push(o);
    return acc;
  }, {});
  const sortedYears = Object.keys(groupedPrevious).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Tabs & Buttons */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("current")}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              tab === "current" ? "bg-cyan-600 text-white shadow-lg" : "bg-gray-300 text-gray-700 hover:bg-gray-400"
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setTab("previous")}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              tab === "previous" ? "bg-cyan-600 text-white shadow-lg" : "bg-gray-300 text-gray-700 hover:bg-gray-400"
            }`}
          >
            Previous
          </button>
        </div>

        {tab === "current" && (
          <div className="flex gap-2">
            <button onClick={openAddModal} className="bg-cyan-600 text-white px-4 py-2 rounded-lg shadow hover:bg-cyan-700 transition">
              + Add Official
            </button>
            <button onClick={startNewYear} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition">
              Start New Year
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : tab === "current" ? (
        currentOfficials.length === 0 ? (
          <p className="text-gray-600">No current officials.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentOfficials.map((o) => (
              <OfficialCard key={o.ID} official={o} openEditModal={openEditModal} handleDelete={handleDelete} />
            ))}
          </div>
        )
      ) : sortedYears.length === 0 ? (
        <p className="text-gray-600">No previous officials.</p>
      ) : (
        sortedYears.map((year) => (
          <div key={year} className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{year} Term</h2>
            <div className="space-y-4">
              {groupedPrevious[year].map((o, index) => (
                <PreviousOfficialCard key={o.ID} index={index} official={o} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {isModalOpen && (
        <OfficialModal
          form={form}
          handleChange={handleChange}
          handleFileChange={handleFileChange}
          handleSubmit={handleSubmit}
          closeModal={closeModal}
          isSubmitting={isSubmitting}
          editingOfficial={editingOfficial}
        />
      )}
    </div>
  );
}

// --------------------------
// Subcomponents
// --------------------------
function OfficialCard({ official, openEditModal, handleDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col items-center hover:scale-105 transform transition">
      <img
        src={official.IMAGE_URL ? `${API_URL}${official.IMAGE_URL}` : defaultIcon}
        alt="Profile"
        className="w-28 h-28 rounded-full mb-4 border-2 border-indigo-500 object-cover"
      />
      <h3 className="text-xl font-semibold text-gray-800">{official.NAME}</h3>
      <p className="text-indigo-600 font-medium">{official.POSITION}</p>
      <p className="text-gray-500 text-sm">{official.CONTACT || "No contact"}</p>
      <div className="flex gap-2 mt-3">
        <button onClick={() => openEditModal(official)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Edit</button>
        <button onClick={() => handleDelete(official)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Delete</button>
      </div>
    </div>
  );
}

function PreviousOfficialCard({ index, official }) {
  return (
    <div className="bg-gray-50 rounded-2xl shadow-md p-4 flex items-center gap-4 hover:scale-105 transform transition">
      <span className="font-bold text-gray-700">{index + 1}.</span>
      <img
        src={official.IMAGE_URL ? `${API_URL}${official.IMAGE_URL}` : defaultIcon}
        alt="Profile"
        className="w-20 h-20 rounded-full border-2 border-gray-400 object-cover"
      />
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{official.NAME}</h3>
        <p className="text-indigo-600 font-medium">{official.POSITION}</p>
        <p className="text-gray-500 text-sm">{official.CONTACT || "No contact"}</p>
      </div>
    </div>
  );
}

function OfficialModal({ form, handleChange, handleFileChange, handleSubmit, closeModal, isSubmitting, editingOfficial }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <h2 className="text-2xl font-semibold mb-4">{editingOfficial ? "Edit Official" : "Add Official"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2" required />
          </div>
          <div>
            <label>Position *</label>
            <input name="position" value={form.position} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2" required />
          </div>
          <div>
            <label>Contact</label>
            <input name="contact" value={form.contact} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2" />
          </div>

          {editingOfficial && (
            <div>
              <label>Term Year *</label>
              <input name="term_year" type="number" value={form.term_year} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2" required />
            </div>
          )}

          <div>
            <label>Image (optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm" />
            {form.imagePreview && <img src={form.imagePreview} alt="preview" className="w-28 h-28 rounded-full object-cover mt-3 border-2" />}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm">
              {isSubmitting ? "Saving..." : editingOfficial ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OfficialsPage;
