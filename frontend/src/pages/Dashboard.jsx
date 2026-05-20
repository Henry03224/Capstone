import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const [visibleSections, setVisibleSections] = useState({
    residents: false,
    services: false,
    templates: false,
    complaints: false,
    puroks: false,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [customType, setCustomType] = useState(""); // ✅ NEW
  const [serviceName, setServiceName] = useState("");

  const [totalResidents, setTotalResidents] = useState(0);
  const [services, setServices] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [purokStats, setPurokStats] = useState([]);

  const [currentUser, setCurrentUser] = useState({
    firstName: "Guest",
    lastName: "",
    position: "Visitor",
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Load logged in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Fetch total residents
  useEffect(() => {
    axios
      .get(`${API_URL}/api/residents/count`)
      .then((res) => setTotalResidents(res.data.total ?? 0))
      .catch(console.error);
  }, []);

  // Fetch Purok stats
  useEffect(() => {
    const fetchPurokStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/residents`);
        const counts = {};
        for (const r of res.data) {
          const p = r.purok || "Unassigned";
          counts[p] = (counts[p] || 0) + 1;
        }

        const stats = await Promise.all(
          Object.keys(counts).map(async (purok) => {
            try {
              const mapRes = await axios.get(
                `${API_URL}/api/residents/purok-map?purok=${encodeURIComponent(
                  purok
                )}`
              );
              return {
                purok,
                count: counts[purok],
                mapUrl: mapRes.data.mapUrl,
              };
            } catch {
              return { purok, count: counts[purok], mapUrl: null };
            }
          })
        );

        setPurokStats(stats.sort((a, b) => a.count - b.count));
      } catch (err) {
        console.error("Failed to fetch Purok stats:", err);
      }
    };

    fetchPurokStats();
  }, []);

  // Fetch services
  useEffect(() => {
    axios
      .get(`${API_URL}/api/services`)
      .then((res) => setServices(res.data ?? []))
      .catch(console.error);
  }, []);

  // Fetch pending documents
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/documents/pending-count`
        );
        setPendingCount(res.data.count ?? 0);
      } catch {
        setPendingCount(0);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (id) =>
    setVisibleSections((prev) => ({ ...prev, [id]: !prev[id] }));

  // ✅ UPDATED SUBMIT FUNCTION
  const submitService = async () => {
    const finalType =
      serviceType === "custom" ? customType.trim() : serviceType;

    if (!serviceName.trim() || !finalType.trim())
      return alert("Fill all fields");

    try {
      await axios.post(`${API_URL}/api/services`, {
        name: serviceName.trim(),
        type: finalType.trim().toLowerCase(),
      });

      setModalVisible(false);
      setServiceName("");
      setServiceType("");
      setCustomType("");

      const res = await axios.get(`${API_URL}/api/services`);
      setServices(res.data ?? []);
    } catch {
      alert("Failed to add service");
    }
  };

  const sections = [
    {
      id: "residents",
      title: "👥 Residents",
      items: [
        {
          icon: "🏠",
          title: "Registered Residents",
          desc: `${totalResidents} Total Residents`,
          link: "/residents",
        },
      ],
    },
    {
      id: "puroks",
      title: "📊 Purok Stats",
      items: purokStats.map((p) => ({
        icon: "📍",
        title: p.purok,
        desc: `${p.count} Resident${p.count > 1 ? "s" : ""}`,
        link: `/purok/${encodeURIComponent(p.purok)}`,
        mapUrl: p.mapUrl,
      })),
    },
    {
      id: "services",
      title: "🛠️ Barangay Services",
      items: services.map((s) => ({
        icon: "📄",
        title: s.type,
        desc: s.name,
        link: `/services/${s.type}`,
      })),
      button: true,
    },
    {
      id: "templates",
      title: "📂 Document Templates",
      items: services.map((s) => ({
        icon: "🧾",
        title: `${s.type} Template`,
        desc: `Editable template for ${s.type}`,
        link: `/templates/${s.type}`,
      })),
    },
    {
      id: "complaints",
      title: "🗣️ Complaints",
      items: [
        {
          icon: "📣",
          title: "View Complaints",
          desc: "List of filed complaints",
          link: "/blotters",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7F3] via-white to-[#EEF1E9] p-6 font-poppins">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#6F7E55]">
            📊 Barangay Dashboard
          </h1>
          <div className="mt-2 text-gray-600 flex items-center gap-2">
            <span>Welcome back,</span>
            <span className="font-bold text-[#89986D] text-lg">
              {currentUser.firstName} {currentUser.lastName}
            </span>
            <span className="bg-[#EEF1E9] text-[#6F7E55] text-xs font-semibold px-2 py-0.5 rounded border border-[#89986D] uppercase">
              {currentUser.position}
            </span>
          </div>
        </div>

        <Link
          to="/pending-status"
          className="relative flex items-center bg-[#89986D] text-white px-5 py-2.5 rounded-full shadow-md hover:bg-[#6F7E55] transition"
        >
          ⏰ Pending Documents
          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="mb-8">
          <div
            onClick={() => toggleSection(section.id)}
            className="flex justify-between items-center text-xl font-semibold border-l-4 border-[#89986D] pl-4 py-2 cursor-pointer bg-white shadow-sm rounded-md"
          >
            {section.title}
            <span>
              {visibleSections[section.id] ? "▲" : "▼"}
            </span>
          </div>

          {visibleSections[section.id] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {section.items.length ? (
                section.items.map((item, i) => (
                  <Link
                    key={i}
                    to={item.link}
                    className="bg-white border rounded-xl p-6 shadow-md hover:shadow-xl transition flex flex-col items-center text-center"
                  >
                    <div className="text-4xl mb-3 text-[#89986D]">
                      {item.icon}
                    </div>
                    <h2 className="font-bold">{item.title}</h2>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </Link>
                ))
              ) : (
                <p className="col-span-full text-center italic text-gray-500">
                  No items available
                </p>
              )}

              {section.button && (
                <button
                  onClick={() => setModalVisible(true)}
                  className="bg-[#89986D] text-white py-3 rounded-lg hover:bg-[#6F7E55] transition"
                >
                  + Add New Service
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Modal */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center"
          onClick={() => setModalVisible(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-center text-[#6F7E55] mb-6">
              ➕ Add New Service
            </h2>

            <input
              className="w-full border px-4 py-2 rounded-lg mb-4"
              placeholder="Service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />

            <select
              className="w-full border px-4 py-2 rounded-lg mb-4"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="">Select service type</option>
              <option value="clearance">Clearance</option>
              <option value="residency">Residency</option>
              <option value="business">Business</option>
              <option value="custom">Other (Custom)</option>
            </select>

            {serviceType === "custom" && (
              <input
                className="w-full border px-4 py-2 rounded-lg mb-4"
                placeholder="Enter custom service type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitService}
                className="px-5 py-2 bg-[#89986D] text-white rounded-lg"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;