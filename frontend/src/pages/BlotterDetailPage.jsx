import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeftIcon, 
  PrinterIcon, 
  MapPinIcon, 
  CalendarDaysIcon, 
  UserIcon, 
  UserMinusIcon 
} from "@heroicons/react/24/outline";

// Helper to safely get data
const getField = (obj, keys) => {
  if (!obj) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "";
};

// Status Color Logic
const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("resolved") || s.includes("closed") || s.includes("settled")) return "bg-teal-100 text-teal-800 border-teal-200";
  if (s.includes("active") || s.includes("ongoing") || s.includes("pending")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s.includes("urgent")) return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
};

function BlotterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [blotter, setBlotter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchBlotter = async () => {
      setLoading(true);
      try {
        // 1. Try to fetch specific ID
        const res = await fetch(`${API_URL}/api/blotters/${id}`);
        if (!res.ok) {
           // 2. Fallback: Fetch list and find (if API doesn't support single GET yet)
           const listRes = await fetch(`${API_URL}/api/blotters`);
           const list = await listRes.json();
           const found = list.find(item => String(item.id) === String(id) || String(item.blotter_id) === String(id));
           
           if (found && mounted) setBlotter(found);
           else throw new Error("Record not found");
        } else {
           const data = await res.json();
           if (mounted) setBlotter(data);
        }
      } catch (err) {
        if (mounted) setError("Could not load record.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBlotter();
    return () => { mounted = false; };
  }, [API_URL, id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  // --- EXTRACT DATA ---
  const status = getField(blotter, ["status", "STATUS"]) || "PENDING";
  const dateFiled = getField(blotter, ["date_filed", "created_at"]);
  
  // MAPPING UPDATE:
  // Complainant (Nagreklamo)
  const complainant = getField(blotter, ["complainant", "COMPLAINANT"]) || "Unknown";
  
  // Respondent (Inireklamo) -> Mapped from NAME column in DB
  const respondent = getField(blotter, ["respondent", "name", "NAME", "suspect"]) || "Unknown";
  
  // Narrative
  const narrative = getField(blotter, ["complaint", "COMPLAINT", "details", "narrative"]) || "No details provided.";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-poppins pb-12">
      
      {/* 1. HEADER AREA */}
      <div className="max-w-4xl mx-auto pt-8 pb-6 px-6 flex justify-between items-center">
         <div>
            <button 
               onClick={() => navigate("/blotters")} 
               className="flex items-center gap-2 text-gray-500 hover:text-cyan-700 font-medium transition-colors mb-2"
            >
               <ArrowLeftIcon className="w-4 h-4" /> 
               Back to List
            </button>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Blotter Report Details</h1>
         </div>

         {/* Print Button */}
         <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm font-medium transition-all"
         >
            <PrinterIcon className="w-5 h-5" /> 
            Print
         </button>
      </div>

      {/* 2. MAIN DOCUMENT CARD */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mx-6 print:shadow-none print:border-none">
        
        {/* CARD HEADER: ID & STATUS */}
        <div className="bg-gradient-to-r from-cyan-700 to-cyan-800 p-6 text-white flex justify-between items-center print:bg-gray-800">
            <div>
                <p className="opacity-80 text-xs font-bold uppercase tracking-widest mb-1">Case Number</p>
                <p className="text-3xl font-mono font-bold tracking-tight">#{getField(blotter, ["id", "ID"])}</p>
            </div>
            <div className="text-right">
                <p className="opacity-80 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  status === 'RESOLVED' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                }`}>
                    {status}
                </span>
            </div>
        </div>

        {/* DETAILS BODY */}
        <div className="p-8 space-y-8">
            
            {/* ROW 1: DATE */}
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                <div>
                   <span className="block text-xs font-bold text-gray-400 uppercase">Date Filed</span>
                   <span className="text-sm font-semibold text-gray-800">
                      {dateFiled ? new Date(dateFiled).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : "Date not specified"}
                   </span>
                </div>
            </div>

            {/* ROW 2: PARTIES (THE COMPLAINANT & RESPONDENT) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Complainant Card */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                   <div className="flex items-center gap-2 mb-3">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Complainant (Nagreklamo)</span>
                   </div>
                   <p className="text-xl font-bold text-gray-900">{complainant}</p>
                </div>

                {/* Respondent Card */}
                <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                   <div className="flex items-center gap-2 mb-3">
                      <UserMinusIcon className="w-5 h-5 text-red-600" />
                      <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Respondent (Inireklamo)</span>
                   </div>
                   <p className="text-xl font-bold text-gray-900">{respondent}</p>
                </div>
            </div>

            {/* ROW 3: NARRATIVE */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-6 bg-cyan-600 rounded-full"></span>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Narrative of Incident</h3>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">
                       {narrative}
                    </p>
                </div>
            </div>

            {/* ROW 4: FOOTER / LOCATION (If available) */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>Barangay Abongan, Taytay, Palawan</span>
                </div>
                <div className="italic">
                    Official Record
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default BlotterDetailPage;