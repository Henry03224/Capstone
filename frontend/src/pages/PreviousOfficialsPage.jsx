import React, { useEffect, useState } from "react";
import axios from "axios";

const defaultIcon = "https://cdn-icons-png.flaticon.com/512/194/194938.png";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function PreviousOfficialsPage() {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOfficials = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/officials`);
      setOfficials(data.filter(o => o.STATUS === "PREVIOUS"));
    } catch (err) {
      console.error(err);
      setError("Failed to load previous officials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOfficials(); }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Previous Officials</h1>
      {loading ? <p>Loading...</p> :
       error ? <p className="text-red-600">{error}</p> :
       officials.length === 0 ? <p>No previous officials.</p> :
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {officials.map(o => (
          <div key={o.ID} className="bg-gray-50 rounded-xl shadow p-5 flex flex-col items-center">
            <img src={o.IMAGE_URL ? `${API_URL}${o.IMAGE_URL}` : defaultIcon} alt="Profile" className="w-28 h-28 rounded-full mb-4 border-2 border-gray-400" />
            <h3 className="text-lg font-semibold">{o.NAME}</h3>
            <p className="text-gray-600">{o.POSITION}</p>
            <p className="text-gray-500 text-sm">{o.CONTACT || "No contact"}</p>
          </div>
        ))}
       </div>
      }
    </div>
  );
}

export default PreviousOfficialsPage;
