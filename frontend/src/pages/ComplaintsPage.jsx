import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  PencilSquareIcon, 
  PrinterIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

// Helper to get nested fields safely
const getField = (obj, keys) => {
  if (!obj) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "N/A";
};

// Helper for status colors
const getStatusColor = (status) => {
  if (!status) return "bg-gray-100 text-gray-600";
  const s = status.toLowerCase();
  if (s.includes("solved") || s.includes("closed") || s.includes("settled")) return "bg-green-100 text-green-700 border-green-200";
  if (s.includes("active") || s.includes("ongoing") || s.includes("pending")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s.includes("urgent")) return "bg-red-100 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

function BlotterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [blotter, setBlotter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchBlotter = async () => {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Blotter ID missing.");
        setLoading(false);
        return;
      }

      const detailUrl = `${API_URL}/api/blotters/${encodeURIComponent(id)}`;

      try {
        const res = await fetch(detailUrl, { signal: controller.signal });

        // Handle 404 with Fallback to List (Preserved from your code)
        if (res.status === 404) {
          try {
            const listRes = await fetch(`${API_URL}/api/blotters`, { signal: controller.signal });
            const listData = await listRes.json();
            const found = (Array.isArray(listData) ? listData : []).find((item) => 
               String(item?.id) === String(id) || String(item?.blotter_id) === String(id)
            );
            
            if (found && mounted) setBlotter(found);
            else if (mounted) setError("Blotter record not found.");
            return;
          } catch (e) {
            if (mounted) setError("Blotter record not found.");
            return;
          }
        }

        if (!res.ok) throw new Error("Failed to fetch data.");
        
        const data = await res.json();
        if (mounted) setBlotter(data);

      } catch (err) {
        if (err.name !== "AbortError" && mounted) {
          setError(err.message || "Unable to load details.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBlotter();
    return () => { mounted = false; controller.abort(); };
  }, [API_URL, id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/blotters/${id}`, { method: "DELETE" });
      if (res.ok) navigate("/blotters");
      else throw new Error("Delete failed");
    } catch (err) {
      alert("Error deleting record");
      setDeleting(false);
    }
  };

  // --- RENDERING ---

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>
  );

  if (error) return (
    <div className="p-10 flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-red-500 font-bold text-xl mb-4">⚠️ {error}</div>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Go Back</button>
    </div>
  );

  // Extract Data for Clean Rendering
  const status = getField(blotter, ["status", "STATUS"]);
  const type = getField(blotter, ["incident_type", "type", "incident"]);
  const dateFiled = getField(blotter, ["date_filed", "created_at", "createdAt"]);
  const location = getField(blotter, ["location", "purok", "place_incident"]);
  
  const complainant = getField(blotter, ["complainant", "name", "NAME"]);
  const respondent = getField(blotter, ["respondent", "suspect", "accused"]);
  
  const narrative = getField(blotter, ["complaint", "details", "narrative", "statement"]);
  const officer = getField(blotter, ["officer", "assigned_officer", "desk_officer"]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-10">
      
      {/* 1. TOP HEADER BAR */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              title="Go Back"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Blotter Details</h1>
              <p className="text-xs text-slate-500">View official case record</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
              onClick={() => window.print()}
            >
              <PrinterIcon className="w-4 h-4" /> Print
            </button>
            <button 
              onClick={() => navigate(`/blotter/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-sm transition"
            >
              <PencilSquareIcon className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
            >
              <TrashIcon className="w-4 h-4" /> 
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        
        {/* HEADER CARD: ID & STATUS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
              <ShieldCheckIcon className="w-9 h-9" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Case Number</p>
              <h2 className="text-3xl font-bold text-slate-900">#{getField(blotter, ["id", "ID", "blotter_id"]) || id}</h2>
              <p className="text-sm text-gray-500 font-medium">{type}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(status)} shadow-sm capitalize`}>
                {status || "Unknown Status"}
             </span>
             <p className="text-xs text-gray-400 mt-1">Status of Case</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: MAIN NARRATIVE (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INVOLVED PARTIES */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                 <UserIcon className="w-5 h-5 text-gray-500" />
                 <h3 className="font-bold text-gray-700">Involved Parties</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Complainant */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Complainant (Nagrereklamo)</label>
                  <p className="text-lg font-semibold text-slate-900">{complainant}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">Plaintiff</span>
                </div>
                
                {/* Respondent */}
                <div className="md:border-l md:pl-8 border-gray-100">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Respondent (Inireklamo)</label>
                  <p className="text-lg font-semibold text-slate-900">{respondent}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded uppercase">Defendant</span>
                </div>
              </div>
            </div>

            {/* NARRATIVE / COMPLAINT */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                 <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                 <h3 className="font-bold text-gray-700">Statement of Facts / Narrative</h3>
              </div>
              <div className="p-6">
                 <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <p className="whitespace-pre-line text-gray-700 leading-relaxed text-[15px]">
                      {narrative || <span className="italic text-gray-400">No narrative details provided...</span>}
                    </p>
                 </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: META DATA (1/3 Width) */}
          <div className="space-y-6">
            
            {/* INCIDENT INFO */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Incident Information</h4>
              
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-teal-600 mb-1">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Date & Time Filed</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 ml-6">
                    {dateFiled ? new Date(dateFiled).toLocaleString() : "N/A"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-teal-600 mb-1">
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Place of Incident</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 ml-6">{location}</p>
                </div>
              </div>
            </div>

            {/* OFFICER ON CASE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Admin / Officer</h4>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{officer}</p>
                  <p className="text-xs text-gray-500">Desk Officer</p>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="text-center">
               <p className="text-xs text-gray-400">Record ID: {id}</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default BlotterDetailPage;