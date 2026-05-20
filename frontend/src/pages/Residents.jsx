import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import CustomAppBar from "../components/CustomAppBar";

function Residents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Seniors Filter
  const [showSeniorsOnly, setShowSeniorsOnly] = useState(false);

  // Custom Age Filter
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  // Archive Modal
  const [archiveModal, setArchiveModal] = useState({
    show: false,
    id: null,
    name: "",
  });
  const [archiveReason, setArchiveReason] = useState("");

  const navigate = useNavigate();

  // Fetch residents
  const fetchResidents = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/residents`
      );
      const data = await res.json();
      setResidents(data);
    } catch (err) {
      console.error("Failed to fetch residents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();

    const interval = setInterval(fetchResidents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate age
  const calculateAge = (resident) => {
    const dobString = resident.birth_date || resident.birthdate;

    if (!dobString) return 0;

    const birthDate = new Date(dobString);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Archive Modal Functions
  const openArchiveModal = (id, name) => {
    setArchiveModal({
      show: true,
      id,
      name,
    });
    setArchiveReason("");
  };

  const closeArchiveModal = () => {
    setArchiveModal({
      show: false,
      id: null,
      name: "",
    });
    setArchiveReason("");
  };

  const confirmArchive = async () => {
    if (!archiveReason.trim()) {
      alert("Please provide a reason.");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/residents/archive/${archiveModal.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: archiveReason,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Archived successfully.");
        fetchResidents();
        closeArchiveModal();
      } else {
        alert(data.message || "Failed to archive.");
      }
    } catch (error) {
      console.error(error);
      alert("Connection error.");
    }
  };

  // Filter Logic
  const filtered = residents.filter((r) => {
    const fullName =
      `${r.first_name} ${r.middle_name || ""} ${r.last_name}`.toLowerCase();

    const otherDetails =
      `${r.gender} ${r.purok}`.toLowerCase();

    const searchText = search.toLowerCase();

    const matchesSearch =
      fullName.includes(searchText) ||
      otherDetails.includes(searchText);

    const age = calculateAge(r);

    let matchesAge = true;

    // Min age filter
    if (minAge !== "" && age < Number(minAge)) {
      matchesAge = false;
    }

    // Max age filter
    if (maxAge !== "" && age > Number(maxAge)) {
      matchesAge = false;
    }

    // Seniors only filter
    if (showSeniorsOnly && age < 60) {
      matchesAge = false;
    }

    return matchesSearch && matchesAge;
  });

  // Pagination
  const residentsPerPage = 5;
  const totalPages = Math.ceil(
    filtered.length / residentsPerPage
  );

  const indexOfLast =
    currentPage * residentsPerPage;
  const indexOfFirst =
    indexOfLast - residentsPerPage;

  const currentResidents = filtered.slice(
    indexOfFirst,
    indexOfLast
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleRowClick = (resident) => {
    navigate(`/profile?id=${resident.resident_id}`);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#EEF1E9] to-white text-gray-800 font-poppins relative">
      <CustomAppBar
        title="Residents List"
        icon={UserGroupIcon}
      />

      {/* Archive Modal */}
      {archiveModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#89986D] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-semibold">
                Archive Resident
              </h3>

              <button onClick={closeArchiveModal}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Archive{" "}
                <strong>
                  {archiveModal.name}
                </strong>
                ?
              </p>

              <textarea
                value={archiveReason}
                onChange={(e) =>
                  setArchiveReason(
                    e.target.value
                  )
                }
                placeholder="Reason..."
                className="w-full border border-gray-300 rounded-lg p-3 h-24"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeArchiveModal}
                  className="px-4 py-2 bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmArchive}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-center mt-8 px-6 gap-4">
        {/* Search */}
        <div className="relative w-full xl:w-96">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search residents..."
            className="w-full pl-12 pr-10 py-2.5 rounded-full border border-gray-200 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Seniors Button */}
          <button
            onClick={() => {
              setShowSeniorsOnly(
                !showSeniorsOnly
              );
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm border ${
              showSeniorsOnly
                ? "bg-[#89986D] text-white"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            {showSeniorsOnly
              ? "Show All"
              : "Seniors Only"}
          </button>

          {/* Custom Age Filter */}
          <div className="relative">
            <button
              onClick={() =>
                setShowAgeFilter(
                  !showAgeFilter
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm border bg-white text-gray-600 hover:bg-gray-50"
            >
              <FunnelIcon className="w-5 h-5" />
              Age Filter
            </button>

            {showAgeFilter && (
              <div className="absolute right-0 mt-2 w-64 bg-white shadow-xl rounded-xl border p-4 z-50">
                <h4 className="text-sm font-semibold mb-3">
                  Filter by Age
                </h4>

                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAge}
                    onChange={(e) => {
                      setMinAge(
                        e.target.value
                      );
                      setCurrentPage(1);
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />

                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAge}
                    onChange={(e) => {
                      setMaxAge(
                        e.target.value
                      );
                      setCurrentPage(1);
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={() => {
                    setMinAge("");
                    setMaxAge("");
                    setShowAgeFilter(
                      false
                    );
                    setCurrentPage(1);
                  }}
                  className="w-full bg-red-500 text-white py-2 rounded-lg text-sm"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          {/* Add Resident */}
          <button
            onClick={() =>
              navigate("/addResident")
            }
            className="flex items-center gap-2 bg-[#89986D] hover:bg-[#6F7E55] text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md"
          >
            <PlusIcon className="w-5 h-5" />
            Add Resident
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="animate-spin w-10 h-10 border-4 border-[#89986D] border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg mt-6 mx-6">
            <table className="w-full text-sm">
              <thead className="bg-[#89986D] text-white">
                <tr>
                  <th className="px-6 py-4 text-left">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left">
                    Purok
                  </th>
                  <th className="px-6 py-4 text-left">
                    Gender
                  </th>
                  <th className="px-6 py-4 text-left">
                    Age
                  </th>
                  <th className="px-6 py-4 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {currentResidents.map(
                  (res, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#EEF1E9] even:bg-gray-50 border-b"
                    >
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() =>
                          handleRowClick(
                            res
                          )
                        }
                      >
                        {res.first_name}{" "}
                        {
                          res.middle_name
                        }{" "}
                        {res.last_name}
                      </td>

                      <td className="px-6 py-4">
                        {res.purok}
                      </td>

                      <td className="px-6 py-4">
                        {res.gender}
                      </td>

                      <td className="px-6 py-4">
                        {calculateAge(
                          res
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openArchiveModal(
                              res.resident_id,
                              `${res.first_name} ${res.last_name}`
                            );
                          }}
                          className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                        >
                          <ArchiveBoxIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {currentResidents.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-8 text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center gap-4 mt-6 px-6 mb-8">
            <button
              onClick={goToPrevPage}
              disabled={
                currentPage === 1
              }
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of{" "}
              {totalPages || 1}
            </span>

            <button
              onClick={goToNextPage}
              disabled={
                currentPage ===
                  totalPages ||
                totalPages === 0
              }
              className="px-4 py-2 bg-[#89986D] text-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Residents;