import React, { useState, useEffect } from "react";
import axios from "axios";
import CustomAppBar from "../components/CustomAppBar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function Report() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const today = new Date();

  const [filterType, setFilterType] = useState("month");
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [loading, setLoading] = useState(false);

  const [monthBarData, setMonthBarData] = useState([]);
  const [yearBarData, setYearBarData] = useState([]);
  const [documentDetails, setDocumentDetails] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchReport();
  }, [filterType, selectedDate, month, year]);

  const fetchReport = async () => {
    setLoading(true);

    try {
      let params = {};

      if (filterType === "date") {
        params = { type: "day", date: selectedDate };
      } else if (filterType === "month") {
        params = { type: "month", month, year };
      } else {
        params = { type: "year", year };
      }

      const [approvedRes, pendingRes, detailsRes, feeDay, feeMonth] =
        await Promise.all([
          axios.get(`${API_URL}/api/documents/approved-count`, { params }),
          axios.get(`${API_URL}/api/documents/pending-count`, { params }),
          axios.get(`${API_URL}/api/documents/details`, { params }),
          axios.get(`${API_URL}/api/documents/fee-summary`, {
            params: { ...params, type: "day" }
          }),
          axios.get(`${API_URL}/api/documents/fee-summary`, {
            params: { ...params, type: "month" }
          })
        ]);

      setCurrentPage(1);

      // ======================
      // DAILY DATA (MONTH VIEW)
      // ======================
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        label: i + 1,
        total: 0
      }));

      feeDay.data?.forEach((d) => {
        const idx = Number(d.LABEL) - 1;
        if (days[idx]) days[idx].total = Number(d.TOTAL);
      });

      setMonthBarData(days);

      // ======================
      // MONTHLY DATA (YEAR VIEW)
      // ======================
      const months = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString("default", { month: "short" }),
        total: 0
      }));

      feeMonth.data?.forEach((d) => {
        const idx = Number(d.LABEL) - 1;
        if (months[idx]) months[idx].total = Number(d.TOTAL);
      });

      setYearBarData(months);

      // ======================
      // TOTAL
      // ======================
      let total = 0;

      if (filterType === "date") {
        total = detailsRes.data.reduce(
          (sum, i) => sum + (Number(i.AMOUNT) || 0),
          0
        );
      } else if (filterType === "month") {
        total = days.reduce((sum, i) => sum + i.total, 0);
      } else {
        total = months.reduce((sum, i) => sum + i.total, 0);
      }

      setTotalFee(total);

      setApprovedCount(approvedRes.data.count);
      setPendingCount(pendingRes.data.count);
      setDocumentDetails(detailsRes.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // PAGINATION
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = documentDetails.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(documentDetails.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomAppBar title="Reports" />

      {/* FILTERS */}
      <div className="px-6 pt-6 flex gap-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border px-3 py-2"
        >
          <option value="month">Month</option>
          <option value="date">Date</option>
          <option value="year">Year</option>
        </select>

        {filterType === "date" && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2"
          />
        )}

        {filterType === "month" && (
          <>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border px-3 py-2"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", {
                    month: "long"
                  })}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border px-3 py-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* STATS */}
      <div className="p-6 grid grid-cols-3 gap-6">
        <div>Approved: {approvedCount}</div>
        <div>Pending: {pendingCount}</div>
        <div>Total: ₱{totalFee.toLocaleString()}</div>
      </div>

      {/* CHARTS (FIXED LOGIC) */}
      <div className="grid grid-cols-2 gap-6 px-6">
        {/* DAILY (MONTH) */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="mb-2 font-semibold">Daily (Month)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthBarData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MONTHLY (YEAR) */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="mb-2 font-semibold">Monthly (Year)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearBarData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DETAILS */}
      <div className="bg-white mx-6 mt-6 p-4 rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th>Resident</th>
              <th>Document</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((d) => (
              <tr key={d.ID}>
                <td>{d.RESIDENT}</td>
                <td>{d.DOCUMENT_NAME}</td>
                <td>{d.FILE_TYPE}</td>
                <td>₱{Number(d.AMOUNT || 0)}</td>
                <td>{d.STATUS}</td>
                <td>
                  {new Date(d.DATE_GENERATED).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-end gap-4 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-300"
          >
            Prev
          </button>

          <span>
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Report;