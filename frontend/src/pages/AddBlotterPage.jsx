import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  UserIcon, 
  UserMinusIcon,
  XMarkIcon 
} from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function AddBlotterPage() {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // --- STATE ---
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- COMPLAINANT STATES (Modified for Multiple) ---
  const [complainantList, setComplainantList] = useState([]); // Array ng mga nagreklamo
  const [complainantInput, setComplainantInput] = useState(""); // Text na tinatype
  
  // --- RESPONDENT STATES (Multiple) ---
  const [respondentsList, setRespondentsList] = useState([]); // Array ng mga inireklamo
  const [respondentInput, setRespondentInput] = useState(""); // Text na tinatype
  
  const [complaint, setComplaint] = useState("");
  
  // Suggestion UI States
  const [showComplainantList, setShowComplainantList] = useState(false);
  const [showRespondentList, setShowRespondentList] = useState(false);

  // Refs
  const complainantRef = useRef(null);
  const respondentRef = useRef(null);

  // 1. Fetch Residents
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/residents`);
        const data = await res.json();
        setResidents(data);
      } catch (err) {
        console.error("Error fetching residents:", err);
        setError("Failed to load resident list.");
      } finally {
        setLoading(false);
      }
    };
    fetchResidents();

    // Close dropdowns on click outside
    const handleClickOutside = (event) => {
      if (complainantRef.current && !complainantRef.current.contains(event.target)) {
        setShowComplainantList(false);
      }
      if (respondentRef.current && !respondentRef.current.contains(event.target)) {
        setShowRespondentList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [API_URL]);

  // 2. Filter Logic
  const getFilteredResidents = (query) => {
    if (!query) return [];
    return residents.filter((r) => {
      const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.toLowerCase();
      return fullName.includes(query.toLowerCase());
    }).slice(0, 5);
  };

  // ==========================================
  // --- COMPLAINANT FUNCTIONS (New) ---
  // ==========================================
  const addComplainant = (name) => {
    const trimmedName = name.trim();
    if (trimmedName && !complainantList.includes(trimmedName)) {
      setComplainantList([...complainantList, trimmedName]);
    }
    setComplainantInput(""); 
    setShowComplainantList(false);
  };

  const removeComplainant = (indexToRemove) => {
    setComplainantList(complainantList.filter((_, index) => index !== indexToRemove));
  };

  const handleComplainantKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addComplainant(complainantInput);
    }
  };

  // ==========================================
  // --- RESPONDENT FUNCTIONS ---
  // ==========================================
  const addRespondent = (name) => {
    const trimmedName = name.trim();
    if (trimmedName && !respondentsList.includes(trimmedName)) {
      setRespondentsList([...respondentsList, trimmedName]);
    }
    setRespondentInput(""); 
    setShowRespondentList(false);
  };

  const removeRespondent = (indexToRemove) => {
    setRespondentsList(respondentsList.filter((_, index) => index !== indexToRemove));
  };

  const handleRespondentKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRespondent(respondentInput);
    }
  };

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (complainantList.length === 0) {
      setError("Please add at least one Complainant (Nagreklamo).");
      return;
    }
    if (respondentsList.length === 0) {
      setError("Please add at least one Respondent (Inireklamo).");
      return;
    }
    if (!complaint.trim()) {
      setError("Please enter complaint details.");
      return;
    }

    // Combine arrays into single strings (e.g., "Juan, Pedro")
    const finalComplainants = complainantList.join(", ");
    const finalRespondents = respondentsList.join(", ");

    try {
      const res = await fetch(`${API_URL}/api/blotters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complainant: finalComplainants, // Send as string list
          respondent: finalRespondents,   // Send as string list
          complaint: complaint.trim(),
          status: "PENDING"
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add blotter");
      }

      navigate("/blotters");
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to add blotter record.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-800 font-poppins">
      <CustomAppBar title="File a Blotter" icon={PlusIcon} />

      <div className="max-w-4xl mx-auto mt-8 px-4 pb-20">
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex justify-between items-center">
            <div><p className="font-bold">Error</p><p>{error}</p></div>
            <button onClick={() => setError("")}><XMarkIcon className="w-5 h-5"/></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 sm:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* --- COMPLAINANT (Multiple / Tagging) --- */}
            <div className="relative" ref={complainantRef}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <UserIcon className="w-4 h-4 mr-2 text-cyan-600"/> 
                Complainant(s) (Nagreklamo)
              </label>

              {/* Tag Input Container */}
              <div className="w-full p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent transition bg-white min-h-[50px] flex flex-wrap gap-2">
                
                {/* Selected Complainant Tags */}
                {complainantList.map((comp, idx) => (
                  <span key={idx} className="bg-cyan-100 text-cyan-800 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1">
                    {comp}
                    <button
                      type="button"
                      onClick={() => removeComplainant(idx)}
                      className="hover:text-cyan-900 bg-cyan-200 rounded-full p-0.5"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Input Field */}
                <input
                  type="text"
                  value={complainantInput}
                  onChange={(e) => {
                    setComplainantInput(e.target.value);
                    setShowComplainantList(true);
                  }}
                  onKeyDown={handleComplainantKeyDown}
                  onFocus={() => setShowComplainantList(true)}
                  placeholder={complainantList.length === 0 ? "Type name & press Enter..." : ""}
                  className="flex-1 min-w-[120px] outline-none text-sm bg-transparent py-1"
                  autoComplete="off"
                />
              </div>

              {/* Complainant Dropdown */}
              {showComplainantList && complainantInput && (
                <div className="absolute z-20 bg-white border border-gray-200 w-full rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                  {getFilteredResidents(complainantInput).map((r) => (
                    <div
                      key={r.resident_id}
                      onClick={() => addComplainant(`${r.first_name} ${r.last_name}`)}
                      className="px-4 py-3 cursor-pointer hover:bg-cyan-50 border-b text-sm flex justify-between group"
                    >
                      <span className="font-medium group-hover:text-cyan-700">{r.first_name} {r.last_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{r.purok}</span>
                    </div>
                  ))}
                   {/* Option to add manually if not in list */}
                   {getFilteredResidents(complainantInput).length === 0 && (
                    <div 
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-sm text-gray-600 italic flex items-center gap-2"
                      onClick={() => addComplainant(complainantInput)}
                    >
                      <PlusIcon className="w-4 h-4"/> Add "{complainantInput}" manually
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- RESPONDENT (Multiple / Tagging) --- */}
            <div className="relative" ref={respondentRef}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <UserMinusIcon className="w-4 h-4 mr-2 text-red-600"/> 
                Respondent(s) (Inireklamo)
              </label>

              <div className="w-full p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition bg-white min-h-[50px] flex flex-wrap gap-2">
                
                {/* Selected Respondent Tags */}
                {respondentsList.map((res, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1">
                    {res}
                    <button
                      type="button"
                      onClick={() => removeRespondent(idx)}
                      className="hover:text-red-900 bg-red-200 rounded-full p-0.5"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Input Field */}
                <input
                  type="text"
                  value={respondentInput}
                  onChange={(e) => {
                    setRespondentInput(e.target.value);
                    setShowRespondentList(true);
                  }}
                  onKeyDown={handleRespondentKeyDown}
                  onFocus={() => setShowRespondentList(true)}
                  placeholder={respondentsList.length === 0 ? "Type name & press Enter..." : ""}
                  className="flex-1 min-w-[120px] outline-none text-sm bg-transparent py-1"
                  autoComplete="off"
                />
              </div>

              {/* Respondent Dropdown */}
              {showRespondentList && respondentInput && (
                <div className="absolute z-20 bg-white border border-gray-200 w-full rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                  {getFilteredResidents(respondentInput).map((r) => (
                    <div
                      key={r.resident_id}
                      onClick={() => addRespondent(`${r.first_name} ${r.last_name}`)}
                      className="px-4 py-3 cursor-pointer hover:bg-red-50 border-b text-sm flex justify-between group"
                    >
                      <span className="font-medium group-hover:text-red-700">{r.first_name} {r.last_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{r.purok}</span>
                    </div>
                  ))}
                  {getFilteredResidents(respondentInput).length === 0 && (
                    <div 
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-sm text-gray-600 italic flex items-center gap-2"
                      onClick={() => addRespondent(respondentInput)}
                    >
                      <PlusIcon className="w-4 h-4"/> Add "{respondentInput}" manually
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- COMPLAINT DETAILS --- */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Complaint Details / Narrative</label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition h-40 resize-none shadow-sm"
              placeholder="Describe the incident..."
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate("/blotters")}
              className="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-cyan-700 hover:bg-cyan-800 text-white px-8 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition flex items-center transform active:scale-95"
            >
              <PlusIcon className="w-5 h-5 mr-2" /> 
              File Blotter
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AddBlotterPage;