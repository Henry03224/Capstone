import React, { useEffect, useState, memo } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ITEMS_PER_PAGE = 5;

// ==========================================
// 1. UPDATED ROW COMPONENT (With Release Button)
// ==========================================
const RequestRow = memo(({ req, onView, onUpdateStatus, statusUpdating, onGenerate }) => (
  <tr className="hover:bg-gray-50 transition border-b">
    <td className="px-4 py-3 text-sm text-gray-700">{req.fullName || "—"}</td>
    <td className="px-4 py-3 text-sm text-gray-700">{req.serviceName}</td>
    <td className="px-4 py-3">
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          req.status === "Approved"
            ? "bg-green-100 text-green-700"
            : req.status === "Pending"
            ? "bg-yellow-100 text-yellow-700"
            : req.status === "Released"
            ? "bg-blue-100 text-blue-700" // Color for Released
            : "bg-red-100 text-red-700"
        }`}
      >
        {req.status}
      </span>
    </td>
    <td className="px-4 py-3 flex gap-2 flex-wrap items-center">
      <button
        onClick={() => onView(req)}
        className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition"
      >
        View
      </button>

      {/* Show Approve/Decline buttons ONLY if Pending */}
      {req.status === "Pending" && (
        <>
          <button
            onClick={() => onUpdateStatus(req.id, "Approved")}
            disabled={statusUpdating[req.id]}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition disabled:opacity-50"
          >
            {statusUpdating[req.id] ? "..." : "Approve"}
          </button>
          <button
            onClick={() => onUpdateStatus(req.id, "Declined")}
            disabled={statusUpdating[req.id]}
            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition disabled:opacity-50"
          >
            {statusUpdating[req.id] ? "..." : "Decline"}
          </button>
        </>
      )}

      {/* ⭐ GENERATE & RELEASE BUTTONS (Show if Approved) */}
      {req.status === "Approved" && (
        <>
          <button
            onClick={() => onGenerate(req)}
            className="bg-[#89986D] text-white px-3 py-1 rounded text-xs hover:bg-[#7C8762] transition shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Generate
          </button>

          {/* ⭐ RELEASE BUTTON */}
          <button
            onClick={() => onUpdateStatus(req.id, "Released")}
            disabled={statusUpdating[req.id]}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {statusUpdating[req.id] ? "..." : "Release"}
          </button>
        </>
      )}

      {/* Optional: Indicator for Released */}
      {req.status === "Released" && (
        <span className="text-xs text-gray-400 italic">Completed</span>
      )}
    </td>
  </tr>
));

const RequestsPage = () => {
  // Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [modalData, setModalData] = useState(null); // View Details Modal
  const [page, setPage] = useState(1);

  // Generation States
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Purpose & PDF States
  const [purposeModalOpen, setPurposeModalOpen] = useState(false);
  const [purposeInput, setPurposeInput] = useState("");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // Fetch Requests
  const fetchRequests = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/requests`, {
        params: { _page: pageNumber, _limit: ITEMS_PER_PAGE },
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(page);
  }, [page]);

  // Update Status Logic (Handles Approve, Decline, and Release)
  const updateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this as ${status}?`)) return;

    setStatusUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.put(`${API_BASE}/api/requests/${id}/status`, { status });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Open Generate Modal Logic
  const handleOpenGenerate = async (req) => {
    if (!req.residentId) {
      alert("Warning: No Resident ID linked to this request. Generation might fail.");
    }

    setSelectedRequest(req);
    setSelectedTemplate(null);
    setTemplates([]);
    
    try {
      const res = await axios.get(`${API_BASE}/api/templates?type=${encodeURIComponent(req.serviceName)}`);
      setTemplates(res.data);
      setGenModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      alert("Could not load templates for this service type.");
    }
  };

  // Generate Document Logic
  const handleGenerateDocument = async (purposeValue = null) => {
    if (!selectedRequest || !selectedTemplate) return;

    setGenerating(true);
    setProgress(10); 

    try {
      const interval = setInterval(() => setProgress((prev) => (prev < 90 ? prev + 10 : prev)), 300);

      const payload = {
        residentId: selectedRequest.residentId, 
        templateId: selectedTemplate.id,
        purpose: purposeValue 
      };

      const res = await axios.post(`${API_BASE}/api/generate`, payload);
      const data = res.data;
      clearInterval(interval);

      if (data.requiresInput) {
         setGenerating(false);
         setPurposeModalOpen(true); 
         return; 
      }

      if (data.success) {
        setProgress(100);
        setPdfUrl(`${API_BASE}${data.file}`);
        setGenModalOpen(false);
        setPurposeModalOpen(false);
        setPurposeInput("");
        setPdfModalOpen(true);
      } else {
        alert(data.message || "Failed to generate document");
        setGenerating(false);
      }
    } catch (error) {
      console.error("Generate error:", error);
      alert("Error generating document. Check console.");
      setGenerating(false);
    }
  };

  const handlePurposeSubmit = () => {
    if(!purposeInput.trim()) return alert("Please enter a purpose.");
    handleGenerateDocument(purposeInput);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Service Requests</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#89986D]"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-gray-500 text-lg text-center bg-white p-6 rounded shadow">No requests found.</div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full leading-normal">
              <thead className="bg-[#89986D] text-white uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    onView={setModalData}
                    onUpdateStatus={updateStatus}
                    statusUpdating={statusUpdating}
                    onGenerate={handleOpenGenerate}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="self-center text-sm font-medium">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={requests.length < ITEMS_PER_PAGE}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* MODAL 1: VIEW DETAILS */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setModalData(null)}>✕</button>
            <h2 className="text-xl font-bold mb-4 text-[#89986D]">Request Details</h2>
            <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {modalData.fullName}</p>
                <p><strong>Service:</strong> {modalData.serviceName}</p>
                <p><strong>Status:</strong> {modalData.status}</p>
                <p><strong>Resident ID:</strong> {modalData.residentId || "Not Linked"}</p>
            </div>
            <div className="mt-4 border-t pt-4">
              <p className="font-semibold mb-2 text-sm">Valid ID:</p>
              {modalData.validId ? (
                <img src={`data:image/png;base64,${modalData.validId}`} alt="ID" className="w-full h-40 object-contain bg-gray-100 rounded border" />
              ) : (
                <p className="text-gray-500 italic text-sm">No ID uploaded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TEMPLATE SELECTION */}
      {genModalOpen && selectedRequest && !purposeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md animate-fade-in-up">
            <h2 className="text-lg font-bold mb-1">Generate Document</h2>
            <p className="text-sm text-gray-500 mb-4">For: <span className="font-semibold text-[#89986D]">{selectedRequest.fullName}</span></p>

            <label className="block text-sm font-medium mb-2 text-gray-700">Select Template</label>
            <select 
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#89986D] outline-none"
                onChange={(e) => {
                    const tpl = templates.find(t => t.id === parseInt(e.target.value));
                    setSelectedTemplate(tpl);
                }}
                value={selectedTemplate?.id || ""}
            >
                <option value="">-- Choose a template --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.filename}</option>)}
            </select>
            
            {templates.length === 0 && (
                <p className="text-xs text-red-500 mt-2">No templates found. Make sure you have uploaded a template with type "{selectedRequest.serviceName}".</p>
            )}

            {generating && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-[#89986D] h-2 transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
                <button onClick={() => setGenModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button 
                    onClick={() => handleGenerateDocument(null)}
                    disabled={!selectedTemplate || generating}
                    className="flex-1 bg-[#89986D] hover:bg-[#7C8762] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    {generating ? "Processing..." : "Generate"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PURPOSE INPUT */}
      {purposeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <div className="text-center mb-4">
                     <div className="bg-yellow-100 text-yellow-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">?</div>
                     <h3 className="text-lg font-bold text-gray-800">Purpose Required</h3>
                     <p className="text-xs text-gray-500">Please specify the reason for this document.</p>
                </div>
                
                <textarea 
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#89986D] outline-none"
                    rows="3"
                    placeholder="e.g. Scholarship Application..."
                    value={purposeInput}
                    onChange={(e) => setPurposeInput(e.target.value)}
                ></textarea>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => { setPurposeModalOpen(false); setGenerating(false); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                    <button onClick={handlePurposeSubmit} disabled={generating || !purposeInput.trim()} className="flex-1 bg-[#89986D] text-white py-2 rounded-lg text-sm font-medium">Submit</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL 4: PDF PREVIEW */}
      {pdfModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70]" onClick={() => setPdfModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-full h-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700">Preview</h3>
                <button onClick={() => setPdfModalOpen(false)} className="text-gray-500 hover:text-red-500 font-bold">✕</button>
            </div>
            <iframe src={pdfUrl} className="w-full flex-1 rounded border bg-gray-100" title="Generated PDF"></iframe>
            <div className="flex justify-end gap-2 mt-3">
              <a href={pdfUrl} download className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Download</a>
              <button onClick={() => { const win = window.open(pdfUrl, "_blank"); if (win) win.onload = () => win.print(); }} className="bg-[#89986D] text-white px-4 py-2 rounded-lg text-sm">Print</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RequestsPage;