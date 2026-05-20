import React, { useState } from "react";

function SMSTemplate() {
  const [template, setTemplate] = useState("Hi {name}, your request is approved.");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name || !number) return alert("Please enter name and phone number.");
    setSending(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/smstemplate/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number, template }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`✅ SMS sent successfully to ${number}`);
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      alert("Failed to send SMS.");
    } finally {
      setSending(false);
    }
  };

  const previewMessage = template
    .replace(/{name}/g, name || "{name}")
    .replace(/{number}/g, number || "{number}");

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-semibold mb-4">📨 SMS Sender</h1>

      <div className="bg-white shadow rounded-lg p-4 max-w-lg">
        <label className="block text-gray-700 font-medium mb-1">Full Name</label>
        <input
          type="text"
          placeholder="e.g. Juan Dela Cruz"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />

        <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
        <input
          type="text"
          placeholder="e.g. 09123456789"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />

        <label className="block text-gray-700 font-medium mb-1">SMS Template</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Write your SMS template here... Use {name} and {number}"
          className="w-full p-2 border rounded h-32 resize-none"
        />

        <div className="text-sm text-gray-500 mt-2">
          Available placeholders: <code>{'{name}'}</code>, <code>{'{number}'}</code>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 rounded p-3 mt-3 text-gray-700 text-sm">
          <strong>Preview:</strong> {previewMessage}
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className={`mt-3 px-5 py-2 rounded text-white ${
            sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {sending ? "Sending..." : "📩 Send SMS"}
        </button>
      </div>
    </div>
  );
}

export default SMSTemplate;
