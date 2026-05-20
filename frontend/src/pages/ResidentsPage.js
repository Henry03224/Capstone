import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ResidentsPage = () => {
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  
  // State para sa loading ng buttons
  const [registering, setRegistering] = useState({});
  const [updating, setUpdating] = useState({}); // State para sa update loading
  
  // State para sa status indicators
  const [statusMap, setStatusMap] = useState({}); 

  const [residentsPage, setResidentsPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Fetch residents
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingResidents(true);
        const resResp = await axios.get(`${API_BASE}/api/residents`);
        if (!mounted) return;
        setResidents(Array.isArray(resResp.data) ? resResp.data : []);
      } catch (err) {
        console.error("Failed to fetch residents:", err);
      } finally {
        if (mounted) setLoadingResidents(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // 2. REGISTER FUNCTION (Create Account)
  const handleRegister = async (resident) => {
    const id = resident.resident_id;
    setRegistering((p) => ({ ...p, [id]: true }));

    try {
      const res = await axios.post(`${API_BASE}/api/residents/firebase-register/${id}`);
      
      setStatusMap((p) => ({ ...p, [id]: 'registered' }));
      alert(`✅ Success!\nCreated account for: ${res.data.userData.email}`);
    } catch (err) {
      alert(`❌ Register Failed: ${err?.response?.data?.message || "Error occurred"}`);
    } finally {
      setRegistering((p) => ({ ...p, [id]: false }));
    }
  };

  // 3. UPDATE FUNCTION (Sync Data Only)
  const handleUpdate = async (resident) => {
    const id = resident.resident_id;
    setUpdating((p) => ({ ...p, [id]: true })); // Start loading spinner for update

    try {
      // Calls the new PUT endpoint
      const res = await axios.put(`${API_BASE}/api/residents/firebase-update/${id}`);
      
      setStatusMap((p) => ({ ...p, [id]: 'updated' }));
      alert(`🔄 Updated!\nSynced data for: ${res.data.updates.fullName}`);

    } catch (err) {
      console.error(err);
      // Kung 404, ibig sabihin wala pa sa firebase
      if (err.response && err.response.status === 404) {
        alert("⚠️ User not found in Firebase.\nPlease click 'Register' first.");
      } else {
        alert(`❌ Update Failed: ${err?.response?.data?.message || "Server Error"}`);
      }
    } finally {
      setUpdating((p) => ({ ...p, [id]: false })); // Stop loading spinner
    }
  };

  const getImageUrl = (path) => path ? `${API_BASE}${path}` : "https://via.placeholder.com/50?text=No+Img";

  // Pagination
  const totalPages = Math.ceil(residents.length / itemsPerPage);
  const start = (residentsPage - 1) * itemsPerPage;
  const currentResidents = residents.slice(start, start + itemsPerPage);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Resident Management</h2>
      
      {loadingResidents ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      ) : currentResidents.length === 0 ? (
        <div className="text-gray-500 text-center text-xl mt-10">No residents found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg shadow-lg bg-white">
            <table className="min-w-full table-auto">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase">Profile</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase">Details</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold uppercase">Sync Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentResidents.map((r) => {
                  const isReg = registering[r.resident_id];
                  const isUpd = updating[r.resident_id];
                  const hasEmail = Boolean(r.email);

                  return (
                    <tr key={r.resident_id} className="hover:bg-blue-50">
                      {/* Profile Image */}
                      <td className="px-6 py-4">
                        <img 
                          src={getImageUrl(r.profile_image)} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => { e.target.src = "https://via.placeholder.com/50?text=Err"; }}
                        />
                      </td>

                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{r.first_name} {r.last_name}</div>
                        <div className="text-xs text-gray-500">{r.email || "No Email"}</div>
                      </td>

                      {/* Other Details */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                         {r.purok} <br/> {r.phone_number}
                      </td>
                      
                      {/* ACTION BUTTONS */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          
                          {/* REGISTER BUTTON (Blue) */}
                          <button
                            onClick={() => handleRegister(r)}
                            disabled={isReg || isUpd || !hasEmail}
                            className={`px-3 py-1.5 rounded text-xs font-bold text-white shadow transition
                              ${!hasEmail ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                              ${isReg ? "opacity-75 cursor-wait" : ""}
                            `}
                          >
                            {isReg ? "Creating..." : "Register"}
                          </button>

                          {/* UPDATE BUTTON (Orange) */}
                          <button
                            onClick={() => handleUpdate(r)}
                            disabled={isReg || isUpd || !hasEmail}
                            className={`px-3 py-1.5 rounded text-xs font-bold text-white shadow transition
                              ${!hasEmail ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}
                              ${isUpd ? "opacity-75 cursor-wait" : ""}
                            `}
                          >
                            {isUpd ? "Syncing..." : "Update"}
                          </button>

                        </div>
                        
                        {/* Status Messages */}
                        {statusMap[r.resident_id] === 'registered' && (
                           <div className="text-xs text-green-600 mt-2 font-semibold">✓ Registered</div>
                        )}
                        {statusMap[r.resident_id] === 'updated' && (
                           <div className="text-xs text-orange-600 mt-2 font-semibold">✓ Updated</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button onClick={() => setResidentsPage(p => Math.max(1, p - 1))} disabled={residentsPage === 1} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">Prev</button>
            <span className="text-gray-700">Page {residentsPage} of {totalPages}</span>
            <button onClick={() => setResidentsPage(p => Math.min(totalPages, p + 1))} disabled={residentsPage === totalPages} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">Next</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ResidentsPage;