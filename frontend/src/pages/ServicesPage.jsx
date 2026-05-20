import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ClipboardDocumentListIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function ServicesPage() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection States
  const [selectedResident, setSelectedResident] = useState(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeService, setActiveService] = useState(null);

  // PDF & Generation States
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // ⭐ NEW STATES FOR PURPOSE HANDLING
  const [purposeModalOpen, setPurposeModalOpen] = useState(false);
  const [purposeInput, setPurposeInput] = useState("");

  const navigate = useNavigate();
  const { type: selectedServiceType } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedServiceFromQuery = queryParams.get("serviceType");

  // Fetch Residents
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/residents`);
        const data = await res.json();
        setResidents(data);
      } catch (error) {
        console.error("Failed to fetch residents:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResidents();
    const interval = setInterval(fetchResidents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/services`);
        const data = await res.json();
        setServices(data);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      }
    };
    fetchServices();
  }, []);

  // Fetch Templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templateType = selectedServiceType || selectedServiceFromQuery;
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/templates${templateType ? `?type=${templateType}` : ""}`
        );
        const data = await res.json();
        setTemplates(data);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplates();
  }, [selectedServiceType, selectedServiceFromQuery]);

  // Filtering Logic
  const filtered = residents.filter((r) =>
    `${r.first_name} ${r.middle_name} ${r.last_name} ${r.gender} ${r.purok}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const residentsPerPage = 5;
  const totalPages = Math.ceil(filtered.length / residentsPerPage) || 1;
  const indexOfLast = currentPage * residentsPerPage;
  const indexOfFirst = indexOfLast - residentsPerPage;
  const currentResidents = filtered.slice(indexOfFirst, indexOfLast);

  const goToNextPage = () => currentPage < totalPages && setCurrentPage((prev) => prev + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage((prev) => prev - 1);

  const handleGenerateClick = async (resident) => {
    const fullName = `${resident.first_name} ${resident.last_name}`;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/blotters/check/${encodeURIComponent(fullName)}`);
      const data = await res.json();
      if (data.hasBlotter) {
        alert("❌ This resident has a pending blotter and cannot generate a service.");
        return;
      }
      setSelectedResident(resident);
      setSelectedTemplate(null);
      setActiveService(null);
      setServiceModalOpen(true);
    } catch (err) {
      console.error("Blotter check failed:", err);
      alert("Failed to verify blotter status");
    }
  };

  const serviceFilter = selectedServiceType || selectedServiceFromQuery;
  const availableServices = serviceFilter ? services.filter((s) => s.type === serviceFilter) : services;

  const filteredTemplates = activeService
    ? templates.filter((tpl) => tpl.service_id === activeService.id)
    : templates;


  // ⭐ MODIFIED GENERATE FUNCTION
  // Tumatanggap ito ng optional na 'purposeValue'
  const handleGenerateDocument = async (purposeValue = null) => {
    if (!selectedResident || !selectedTemplate) return;

    setGenerating(true);
    setProgress(10); 

    try {
      const interval = setInterval(() => setProgress((prev) => (prev < 90 ? prev + 10 : prev)), 300);

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentId: selectedResident.resident_id,
          templateId: selectedTemplate.id,
          purpose: purposeValue // Ipadala ang purpose kung meron
        })
      });

      const data = await res.json();
      clearInterval(interval);

      // 1. Check if Backend requires Input (Purpose)
      if (data.requiresInput) {
         setGenerating(false); // Stop loading temporarily
         setPurposeModalOpen(true); // Open Purpose Modal
         return; 
      }

      // 2. Success Case
      if (data.success) {
        setProgress(100);
        setPdfUrl(`${process.env.REACT_APP_API_URL}${data.file}`);
        setPdfModalOpen(true);
        
        // Close other modals
        setPurposeModalOpen(false);
        setPurposeInput(""); // Reset input
      } else {
        alert(data.message || "Failed to generate document");
        setGenerating(false);
      }

    } catch (error) {
      console.error("Generate doc error:", error);
      alert("Error generating document");
      setGenerating(false);
    }
  };

  // Function called when "Submit" is clicked in Purpose Modal
  const handlePurposeSubmit = () => {
      if(!purposeInput.trim()) return alert("Please enter a purpose.");
      // Call generate again, passing the input value
      handleGenerateDocument(purposeInput);
  };

  const handlePrint = async () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, "_blank");
    if (win) win.onload = () => win.print();
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/generate/log-print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentId: selectedResident.resident_id,
          templateId: selectedTemplate.id
        })
      });
      console.log("Document print logged!");
    } catch (err) {
      console.error("Failed to log print:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#F5F5EC] to-white text-gray-800 font-poppins">
      <CustomAppBar title="Generate Services" icon={ClipboardDocumentListIcon} />

      {/* Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-8 px-6 gap-4">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search residents..."
            className="w-full pl-12 pr-10 py-2 rounded-full border border-gray-200 shadow focus:ring-2 focus:ring-[#89986D] focus:outline-none text-sm transition"
          />
           {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">✖</button>
          )}
        </div>
      </div>

      {/* Residents Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="w-12 h-12 border-4 border-[#89986D] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-gray-600">Loading residents...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg mt-8 mx-6">
            <table className="w-full text-sm">
              <thead className="bg-[#89986D] text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">Purok</th>
                  <th className="px-6 py-4 text-left">Gender</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentResidents.map((resident) => (
                  <tr key={resident.resident_id} className="hover:bg-[#E2E5D9] even:bg-gray-50 transition">
                    <td className="px-6 py-4 border-b font-medium text-[#89986D]">{resident.first_name} {resident.middle_name} {resident.last_name}</td>
                    <td className="px-6 py-4 border-b">{resident.purok}</td>
                    <td className="px-6 py-4 border-b">{resident.gender}</td>
                    <td className="px-6 py-4 border-b flex gap-2">
                      <button onClick={() => handleGenerateClick(resident)} className="bg-[#89986D] hover:bg-[#7C8762] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                        Generate Service
                      </button>
                    </td>
                  </tr>
                ))}
                {currentResidents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">No residents found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center gap-4 mt-8 px-6">
            <button onClick={goToPrevPage} disabled={currentPage === 1} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${currentPage === 1 ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-[#89986D] text-white hover:bg-[#7C8762]"}`}>← Prev</button>
            <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
            <button onClick={goToNextPage} disabled={currentPage === totalPages} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${currentPage === totalPages ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-[#89986D] text-white hover:bg-[#7C8762]"}`}>Next →</button>
          </div>
        </>
      )}

      {/* 🟢 SERVICE SELECTION MODAL */}
      {serviceModalOpen && selectedResident && !purposeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setServiceModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 text-center">
              Generate Service for <span className="text-[#89986D]">{selectedResident.first_name} {selectedResident.last_name}</span>
            </h2>

            {/* Services */}
            <div className="grid gap-3 mb-4">
              {availableServices.length > 0 ? availableServices.map((service) => (
                <button key={service.id} onClick={() => setActiveService(service)} className={`py-2 rounded-lg ${activeService?.id === service.id ? "bg-[#7C8762] text-white" : "bg-[#89986D] hover:bg-[#7C8762] text-white"}`}>
                  {service.name}
                </button>
              )) : <p className="text-gray-500 text-center">No services available</p>}
            </div>

            {/* Template selection */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1 text-center">Select Template</label>
              <select value={selectedTemplate?.id || ""} onChange={(e) => {
                  const tpl = filteredTemplates.find(tpl => tpl.id === parseInt(e.target.value, 10));
                  setSelectedTemplate(tpl);
              }} className="w-full border rounded px-3 py-2">
                <option value="">-- Select Template --</option>
                {filteredTemplates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.filename}</option>)}
              </select>
            </div>

            {/* Progress */}
            {generating && (
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden">
                <div className="bg-green-600 h-3 transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            <button onClick={() => handleGenerateDocument(null)} disabled={!selectedTemplate || generating} className={`mt-4 w-full py-2 rounded-lg ${!selectedTemplate || generating ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}`}>
              {generating ? "Processing..." : "Generate Document"}
            </button>
            <button onClick={() => setServiceModalOpen(false)} className="mt-2 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* 🔴 PURPOSE INPUT MODAL (NEW) */}
      {purposeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Details Required</h3>
                <p className="text-sm text-gray-600 mb-4">Please specify the purpose for this document:</p>
                
                <textarea 
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#89986D] focus:outline-none"
                    rows="3"
                    placeholder="e.g. For Employment, School Requirement..."
                    value={purposeInput}
                    onChange={(e) => setPurposeInput(e.target.value)}
                ></textarea>

                <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => { setPurposeModalOpen(false); setGenerating(false); }} 
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handlePurposeSubmit}
                        disabled={generating}
                        className="flex-1 bg-[#89986D] hover:bg-[#7C8762] text-white py-2 rounded-lg text-sm font-medium"
                    >
                        {generating ? "Generating..." : "Submit & Generate"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 🔵 PDF PREVIEW MODAL */}
      {pdfModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPdfModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg p-4 w-full h-full" style={{ maxWidth: "95%", maxHeight: "95%" }} onClick={(e) => e.stopPropagation()}>
            <iframe src={pdfUrl} className="w-full h-full rounded border" title="Generated PDF"></iframe>
            <div className="flex justify-end gap-2 mt-2">
              <a href={pdfUrl} download className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">Download</a>
              <button onClick={handlePrint} className="bg-[#89986D] hover:bg-[#7C8762] text-white px-4 py-2 rounded-lg text-sm">Print</button>
              <button onClick={() => setPdfModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicesPage;