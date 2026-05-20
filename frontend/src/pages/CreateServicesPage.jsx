import React, { useEffect, useState } from "react";
import axios from "axios";


const API_BASE = "http://localhost:5000";

const ManageServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // Kung null = Create Mode, Kung may ID = Edit Mode
  
  // Main Form Data State
  const [formData, setFormData] = useState({
    title: "", 
    type: "Certifications",
    fee: 0,
    icon: "document-text-outline",
    requiresId: false,
    docxTemplate: "",
    // DITO ANG DYNAMIC FIELDS ARRAY
    formFields: [] 
  });

  // =========================
  // 1. FETCH SERVICES
  // =========================
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/online-services`);
      setServices(res.data);
    } catch (err) {
      console.error("Failed to fetch services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // =========================
  // 2. SYNC FROM ORACLE
  // =========================
  const handleSync = async () => {
    if (!window.confirm("Sync with Oracle? Existing custom forms will be preserved.")) return;
    
    setSyncing(true);
    try {
      const res = await axios.post(`${API_BASE}/api/online-services/sync`);
      alert(`Sync Complete! ${res.data.message}`);
      fetchServices();
    } catch (err) {
      console.error("Sync error:", err);
      alert("Failed to sync with Oracle Database.");
    } finally {
      setSyncing(false);
    }
  };

  // =========================
  // 3. FORM BUILDER LOGIC (Add/Remove Fields)
  // =========================
  
  // Magdagdag ng blankong field
  const addField = () => {
    setFormData({
      ...formData,
      formFields: [
        ...formData.formFields,
        { key: "", label: "", type: "text", required: false, options: "" }
      ]
    });
  };

  // Magtanggal ng field
  const removeField = (index) => {
    const newFields = [...formData.formFields];
    newFields.splice(index, 1);
    setFormData({ ...formData, formFields: newFields });
  };

  // Update ng specific field property
  const updateField = (index, prop, value) => {
    const newFields = [...formData.formFields];
    newFields[index][prop] = value;
    setFormData({ ...formData, formFields: newFields });
  };

  // =========================
  // 4. SUBMIT (CREATE or UPDATE)
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check if fields have keys/labels
    const invalidFields = formData.formFields.some(f => !f.key || !f.label);
    if(invalidFields) return alert("All form fields must have a Label and a Key.");

    try {
      if (editingId) {
        // UPDATE EXISTING (PUT)
        await axios.put(`${API_BASE}/api/online-services/${editingId}`, formData);
        alert("Service Updated Successfully!");
      } else {
        // CREATE NEW (POST)
        await axios.post(`${API_BASE}/api/online-services`, formData);
        alert("New Service Created Successfully!");
      }
      
      closeModal();
      fetchServices();
    } catch (err) {
      console.error(err);
      alert("Operation failed. Please check console.");
    }
  };

  // =========================
  // 5. DELETE SERVICE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Permanently remove this service?")) return;
    try {
      await axios.delete(`${API_BASE}/api/online-services/${id}`);
      fetchServices();
    } catch (err) {
      alert("Failed to delete.");
    }
  };

  // =========================
  // HELPER FUNCTIONS
  // =========================
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: "", type: "Certifications", fee: 0, 
      icon: "document-text-outline", requiresId: false, 
      docxTemplate: "", formFields: [] 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (svc) => {
    setEditingId(svc.id);
    setFormData({
      title: svc.title || "",
      type: svc.type || "Certifications",
      fee: svc.fee || 0,
      icon: svc.icon || "document-text-outline",
      requiresId: svc.requiresId || false,
      docxTemplate: svc.docxTemplate || "",
      formFields: svc.formFields || [] // Load existing fields
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const getEmojiIcon = (iconName) => {
    if (iconName?.includes('document')) return '📄';
    if (iconName?.includes('people')) return '👥';
    if (iconName?.includes('home')) return '🏠';
    if (iconName?.includes('business')) return '🏢';
    return '📱'; 
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Online Services Management</h1>
            <p className="text-gray-500 text-sm">Manage Services & Build Dynamic Forms</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={openCreateModal}
              className="px-6 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition flex items-center gap-2"
            >
              + Add Service
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition flex items-center gap-2 ${
                syncing ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {syncing ? "Syncing..." : "Sync Oracle"}
            </button>
        </div>
      </div>

      {/* MODAL (CREATE / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-fade-in-up">
                
                {/* Modal Header */}
                <div className="bg-gray-800 p-4 flex justify-between items-center rounded-t-xl">
                    <h3 className="text-lg font-bold text-white">
                        {editingId ? `✏️ Edit Service` : "✨ Create New Service"}
                    </h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
                </div>
                
                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  <form id="serviceForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* LEFT SIDE: Basic Info */}
                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-700 border-b pb-2 text-sm uppercase tracking-wider">1. Basic Details</h4>
                          
                          <div>
                              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Service Name</label>
                              <input required type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Type</label>
                                  <input type="text" className="w-full p-2 border border-gray-300 rounded outline-none"
                                      value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Fee (PHP)</label>
                                  <input type="number" className="w-full p-2 border border-gray-300 rounded outline-none"
                                      value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">DOCX Template (Filename)</label>
                              <input type="text" placeholder="e.g. clearance.docx" className="w-full p-2 border border-gray-300 rounded font-mono text-sm outline-none"
                                  value={formData.docxTemplate} onChange={e => setFormData({...formData, docxTemplate: e.target.value})} />
                              <p className="text-[10px] text-gray-400 mt-1">This file must exist in your backend 'uploads' folder.</p>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-blue-800 uppercase mb-1">App Icon</label>
                              <select className="w-full p-2 border border-gray-300 rounded outline-none bg-white"
                                  value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})}>
                                  <option value="document-text-outline">📄 Document</option>
                                  <option value="people-outline">👥 People</option>
                                  <option value="home-outline">🏠 Home</option>
                                  <option value="business-outline">🏢 Business</option>
                                  <option value="construct-outline">🔨 Tools</option>
                              </select>
                          </div>

                          <div className="flex items-center pt-2 p-3 bg-gray-50 rounded border">
                              <input type="checkbox" id="reqId" className="w-5 h-5 mr-2 text-blue-600 cursor-pointer"
                                  checked={formData.requiresId} onChange={e => setFormData({...formData, requiresId: e.target.checked})} />
                              <label htmlFor="reqId" className="text-sm font-bold text-gray-700 cursor-pointer">User must upload Valid ID?</label>
                          </div>
                      </div>

                      {/* RIGHT SIDE: Dynamic Form Builder */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner flex flex-col h-full">
                          <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-300">
                              <h4 className="font-bold text-indigo-800 text-sm uppercase tracking-wider">2. Form Fields Builder</h4>
                              <button type="button" onClick={addField} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700 transition shadow">
                                  + Add Field
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[450px]">
                              {formData.formFields.length === 0 ? (
                                  <div className="text-center py-10 text-gray-400 italic">
                                      <p>No custom fields yet.</p>
                                      <p className="text-xs">Click "+ Add Field" to start building the form.</p>
                                  </div>
                              ) : (
                                  formData.formFields.map((field, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-300 relative group">
                                          <button type="button" onClick={() => removeField(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 font-bold transition">×</button>
                                          
                                          {/* Row 1: Label & Key */}
                                          <div className="grid grid-cols-2 gap-2 mb-2">
                                              <div>
                                                  <label className="text-[10px] font-bold text-gray-400 uppercase">Question Label</label>
                                                  <input type="text" className="w-full p-1 border rounded text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Purpose"
                                                      value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} />
                                              </div>
                                              <div>
                                                  <label className="text-[10px] font-bold text-gray-400 uppercase">Database Key</label>
                                                  <input type="text" className="w-full p-1 border rounded text-sm font-mono text-gray-600 bg-gray-50 focus:border-indigo-500 outline-none" placeholder="e.g. purpose_of_request"
                                                      value={field.key} onChange={e => updateField(idx, 'key', e.target.value)} />
                                              </div>
                                          </div>

                                          {/* Row 2: Type & Required */}
                                          <div className="flex gap-2 items-center">
                                              <div className="flex-1">
                                                  <select className="w-full p-1 border rounded text-sm bg-gray-50 focus:border-indigo-500 outline-none"
                                                      value={field.type} onChange={e => updateField(idx, 'type', e.target.value)}>
                                                      <option value="text">Text Input</option>
                                                      <option value="number">Number Input</option>
                                                      <option value="dropdown">Dropdown Select</option>
                                                      <option value="date">Date Picker</option>
                                                  </select>
                                              </div>
                                              <div className="flex items-center px-2">
                                                  <input type="checkbox" className="mr-1 w-4 h-4 cursor-pointer"
                                                      checked={field.required} onChange={e => updateField(idx, 'required', e.target.checked)} />
                                                  <span className="text-xs text-gray-600 select-none">Required</span>
                                              </div>
                                          </div>

                                          {/* Row 3: Options (Only if Dropdown) */}
                                          {field.type === 'dropdown' && (
                                              <div className="mt-2 animate-fade-in">
                                                  <label className="text-[10px] font-bold text-indigo-400 uppercase">Dropdown Options (Comma separated)</label>
                                                  <input type="text" className="w-full p-1 border border-indigo-200 rounded text-sm bg-indigo-50 focus:border-indigo-500 outline-none" placeholder="Employment, Travel, Loan"
                                                      value={field.options} onChange={e => updateField(idx, 'options', e.target.value)} />
                                              </div>
                                          )}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                  </form>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-100 p-4 rounded-b-xl flex justify-end gap-3 border-t border-gray-300">
                    <button onClick={closeModal} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded transition">Cancel</button>
                    <button type="submit" form="serviceForm" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition transform hover:scale-105">
                        {editingId ? "Save Changes" : "Create Service"}
                    </button>
                </div>

            </div>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Service List (Firebase & Oracle)</h3>
            <span className="text-xs text-gray-400 font-mono">Total: {services.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No services found online.</p>
            <button onClick={handleSync} className="text-indigo-600 font-bold hover:underline">
                Click here to Sync from Oracle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-bold">Service Name</th>
                  <th className="px-6 py-3 font-bold">Type</th>
                  <th className="px-6 py-3 font-bold">Fee</th>
                  <th className="px-6 py-3 text-center font-bold">Details</th>
                  <th className="px-6 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-indigo-50 transition duration-150">
                    <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{svc.title}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">ID: {svc.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                            {svc.type || "N/A"}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                        {svc.fee ? `₱${svc.fee}` : "Free"}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="text-xs text-gray-500 flex flex-col gap-1 items-center">
                            <span className="flex items-center gap-1">
                                {getEmojiIcon(svc.icon)} {svc.formFields ? svc.formFields.length : 0} Fields
                            </span>
                            {svc.docxTemplate && (
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[100px]">
                                    {svc.docxTemplate}
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(svc)}
                        className="text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded text-xs font-medium transition shadow-sm"
                      >
                        Edit / Builder
                      </button>
                      <button
                        onClick={() => handleDelete(svc.id)}
                        className="text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded text-xs font-medium transition shadow-sm"
                      >
                        Delete
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
};

export default ManageServicesPage;