import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  CheckIcon,
  UserIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function BlotterListPage() {
  const [blotters, setBlotters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // CONFIRM MODAL STATES
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [selectedBlotter, setSelectedBlotter] = useState(null);

  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [currentUser, setCurrentUser] = useState({
    username: "SYSTEM",
    firstName: "Guest",
    lastName: "",
    position: "Visitor",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const fetchBlotters = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/blotters`);
        const data = await res.json();
        setBlotters(Array.isArray(data) ? data : []);
      } catch {
        setError("Unable to load blotter records.");
      } finally {
        setLoading(false);
      }
    };

    fetchBlotters();
  }, [API_URL]);

  const filtered = blotters.filter((b) => {
    const q = search.toLowerCase();
    return (
      `${b.complainant} ${b.respondent} ${b.complaint}`
        .toLowerCase()
        .includes(q)
    );
  });

  const handleRowClick = (id) => {
    navigate(`/blotter/${id}`);
  };

  // OPEN CONFIRM MODAL
  const openConfirm = (blotter) => {
    setSelectedBlotter(blotter);
    setConfirmInput("");
    setShowConfirm(true);
  };

  // PATCH STATUS AFTER CONFIRM
  const toggleStatus = async () => {
    if (confirmInput !== "confirm") {
      alert("You must type 'confirm' to proceed.");
      return;
    }

    const b = selectedBlotter;
    const newStatus = b.status === "RECORDED" ? "RESOLVED" : "RECORDED";

    try {
      await fetch(`${API_URL}/api/blotters/${b.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": currentUser.username,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      setBlotters((prev) =>
        prev.map((item) =>
          item.id === b.id ? { ...item, status: newStatus } : item
        )
      );

      setShowConfirm(false);
    } catch {
      alert("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    return status === "RESOLVED"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <CustomAppBar
        title="Blotter Records"
        icon={ClipboardDocumentListIcon}
      />

      {/* USER */}
      <div className="px-6 mt-3 text-sm text-gray-600">
        Logged in as:{" "}
        <b>
          {currentUser.firstName} {currentUser.lastName}
        </b>{" "}
        ({currentUser.position})
      </div>

      {/* TOP BAR */}
      <div className="flex justify-between items-center px-6 mt-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blotter..."
          className="border rounded-lg px-3 py-2 w-1/3 shadow-sm focus:ring-2 focus:ring-cyan-400"
        />

        <button
          onClick={() => navigate("/add-blotter")}
          className="bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
        >
          <PlusIcon className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="px-6 mt-6">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-cyan-700 text-white">
                <tr>
                  <th className="p-3">ID</th>
                  <th>Complainant</th>
                  <th>Respondent</th>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => handleRowClick(b.id)}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-3">#{b.id}</td>

                    <td>
                      <UserIcon className="w-4 inline mr-1 text-blue-500" />
                      {b.complainant}
                    </td>

                    <td>
                      <UserMinusIcon className="w-4 inline mr-1 text-red-500" />
                      {b.respondent}
                    </td>

                    <td>{b.complaint}</td>

                    <td>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfirm(b);
                        }}
                        className="p-2 bg-green-100 hover:bg-green-200 rounded-lg"
                      >
                        <CheckIcon className="w-5 h-5 text-green-700" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-2">Confirm Action</h2>

            <p className="text-sm text-gray-600 mb-3">
              Type <b>confirm</b> to proceed updating this blotter.
            </p>

            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="border w-full p-2 rounded mb-4"
              placeholder="type confirm..."
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Cancel
              </button>

              <button
                onClick={toggleStatus}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlotterListPage;