import React, { useState, useEffect } from "react";

function UpdateServiceFees() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5; // 🔹 show 5 rows per page

  // Fetch services from backend
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/services`)
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch((err) => console.error("Failed to load services", err))
      .finally(() => setLoading(false));
  }, []);

  const handleFeeChange = (id, value) => {
    const updated = services.map((s) =>
      s.id === id ? { ...s, fee: Number(value) } : s
    );
    setServices(updated);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/services`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(services),
        }
      );
      const result = await response.json();
      alert(result.message || "Service fees updated!");
    } catch (error) {
      console.error("Error updating fees:", error);
      alert("Failed to update service fees.");
    }
  };

  // 🔹 Search filter
  const filtered = services.filter((s) =>
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  // 🔹 Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen font-poppins">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        💸 Update Service Fees
      </h1>

      {/* 🔹 Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
        <table className="min-w-full border-collapse rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="py-3 px-6 text-left">Service Type</th>
              <th className="py-3 px-6 text-left">Fee (PHP)</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((s) => (
                <tr
                  key={s.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-6">{s.type}</td>
                  <td className="py-3 px-6">
                    <input
                      type="number"
                      value={s.fee || ""}
                      onChange={(e) => handleFeeChange(s.id, e.target.value)}
                      className="w-24 border rounded px-2 py-1 text-gray-700"
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center py-4 text-gray-500">
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 🔹 Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* 🔹 Save Button */}
        <button
          onClick={handleSave}
          className="mt-6 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default UpdateServiceFees;
