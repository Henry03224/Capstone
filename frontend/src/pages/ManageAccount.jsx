import React, { useEffect, useState } from "react";
import axios from "axios";

function ManageAccount() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newPosition, setNewPosition] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchAccounts();
  }, []);

  // ================= FETCH ACCOUNTS =================
  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/accounts`);
      setAccounts(res.data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      alert("Failed to fetch accounts.");
    } finally {
      setLoading(false);
    }
  };

  // ================= EDIT =================
  const handleEdit = (username, position) => {
    setEditingUser(username);
    setNewPosition(position);
  };

  const handleSave = async (username) => {
    try {
      await axios.put(`${API_URL}/api/accounts/${username}`, {
        position: newPosition,
      });

      alert("Position updated successfully!");
      setEditingUser(null);
      fetchAccounts();
    } catch (err) {
      console.error("Error updating position:", err);
      alert("Failed to update position.");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (username) => {
    if (!window.confirm("Are you sure you want to delete this account?"))
      return;

    try {
      await axios.delete(`${API_URL}/api/accounts/${username}`);
      alert("Account deleted successfully!");
      fetchAccounts();
    } catch (err) {
      console.error("Error deleting account:", err);
      alert("Failed to delete account.");
    }
  };

  if (loading) return <p className="p-6">Loading accounts...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">👥 Manage Accounts</h1>

      <div className="bg-white shadow-md rounded-xl p-6 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 border-b">Full Name</th>
              <th className="p-3 border-b">Position</th>
              <th className="p-3 border-b">Actions</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map((acc) => {
              // ✅ Build Full Name properly
              const fullName = `
                ${acc.FIRST_NAME}
                ${acc.MIDDLE_NAME ? acc.MIDDLE_NAME + " " : ""}
                ${acc.LAST_NAME}
                ${acc.SUFFIX ? " " + acc.SUFFIX : ""}
              `
                .replace(/\s+/g, " ")
                .trim();

              return (
                <tr key={acc.USERNAME} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{fullName}</td>

                  <td className="p-3 border-b">
                    {editingUser === acc.USERNAME ? (
                      <select
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        className="border rounded p-1"
                      >
                        <option value="Secretary">Secretary</option>
                        <option value="Treasurer">Treasurer</option>
                        <option value="Chairman">Chairman</option>
                        <option value="Admin">Admin</option>
                      </select>
                    ) : (
                      acc.POSITION
                    )}
                  </td>

                  <td className="p-3 border-b flex gap-2">
                    {editingUser === acc.USERNAME ? (
                      <button
                        onClick={() => handleSave(acc.USERNAME)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleEdit(acc.USERNAME, acc.POSITION)
                        }
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(acc.USERNAME)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageAccount;