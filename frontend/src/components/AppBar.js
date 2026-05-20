import React from 'react';

function AppBar() {
  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 bg-white shadow-md flex items-center justify-between px-6 z-50">
      <h1 className="text-lg font-semibold text-gray-800">Barangay Information System</h1>
      <div className="flex items-center gap-4">
        {/* Example profile avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-300"></div>
      </div>
    </header>
  );
}

export default AppBar;
