// src/components/CustomAppBar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function CustomAppBar({ title, icon: Icon, showBack = true, actions }) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#89986D] text-white py-5 px-6 flex items-center justify-between shadow-lg rounded-b-xl">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-10 h-10" />}
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="bg-white text-[#89986D] px-4 py-2 rounded-md shadow hover:bg-[#F0F2EB] transition"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

export default CustomAppBar;
