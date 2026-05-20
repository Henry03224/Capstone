import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/barangay-logo.png';
import '../styles/hideScrollbar.css';

function Navigation({ children }) {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [transOpen, setTransOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  })();
  const userRole = storedUser?.position;

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  // --- STYLES (Adjusted for Readability & Color Matching) ---

  // 1. UNIFIED BOX STYLE (Used for Dashboard AND Folder Headers)
  // This ensures Dashboard looks EXACTLY like the folders below it.
  const getBoxStyle = (isActiveOrOpen) => {
    return `flex justify-between items-center px-6 py-4 mx-4 mb-3 rounded-xl cursor-pointer shadow-md transition-all duration-300 border 
    font-sans font-bold text-[18px] tracking-wide antialiased
    ${isActiveOrOpen 
      ? 'bg-[#556B2F] text-white border-[#445626] ring-1 ring-[#89986D]' // Active/Open: Dark Olive Green
      : 'bg-[#7F8E63] text-white border-[#6F7E55] hover:bg-[#6F7E55]'    // Inactive/Closed: Sage Green (Closed Folder Color)
    }`;
  };

  // 2. CHILD LINK STYLE (Sub-items)
  // Increased to text-[16px] for better readability
  const getChildLinkStyle = ({ isActive }) => {
    return `block px-5 py-3.5 mb-2 ml-8 mr-4 rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm
    font-sans font-medium text-[16px] antialiased
    ${isActive 
      ? 'bg-white text-[#556B2F] font-bold translate-x-1 shadow-md border-l-4 border-[#556B2F]' 
      : 'bg-black/10 text-gray-50 hover:bg-black/20 hover:text-white hover:pl-6'
    }`;
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Hamburger (Mobile) */}
      <button
        className="fixed top-4 left-4 z-50 text-white bg-[#89986D] p-3 rounded-md md:hidden shadow-lg border border-white/20"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✖' : '☰'}
      </button>

      {/* Sidebar - Width set to 320px for large readable text */}
      <nav
        className={`fixed top-0 left-0 h-screen bg-[#89986D] text-white shadow-2xl flex flex-col w-[320px]
        transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 border-r border-[#6F7E55]`}
      >
        {/* Logo Area */}
        <div className="bg-[#76855B] flex justify-center py-8 shadow-md mb-4">
          <img
            src={logo}
            alt="Barangay Logo"
            className="w-[110px] h-[110px] rounded-full object-cover border-[5px] border-[#89986D] shadow-lg"
          />
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pt-2 pb-10">
          
          {/* 1. DASHBOARD */}
          {/* Using 'end' ensures it only lights up exactly on /dashboard */}
          <NavLink 
            to="/dashboard" 
            end
            className={({ isActive }) => getBoxStyle(isActive)}
          >
            <div className="flex items-center gap-4">
              <span className="text-xl">🏠</span> 
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* 2. GENERAL INFO (Dropdown) */}
          <div>
            <div 
              onClick={() => setGeneralOpen(!generalOpen)} 
              className={getBoxStyle(generalOpen)}
            >
              <span className="flex items-center gap-4"><span className="text-xl">📂</span> General Info</span>
              <span className={`text-sm transition-transform duration-300 ${generalOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>
            
            <div className={`overflow-hidden transition-all duration-300 ${generalOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <NavLink to="/officials" className={getChildLinkStyle}>
                👥 Officials & Staff
              </NavLink>
              {userRole === 'Secretary' && (
                <NavLink to="/post-announcement" className={getChildLinkStyle}>
                  📢 Post Announcement
                </NavLink>
              )}
            </div>
          </div>

          {/* 3. RECORDS (Dropdown) */}
          <div>
            <div 
              onClick={() => setRecordsOpen(!recordsOpen)} 
              className={getBoxStyle(recordsOpen)}
            >
              <span className="flex items-center gap-4"><span className="text-xl">🗄</span> Records</span>
              <span className={`text-sm transition-transform duration-300 ${recordsOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${recordsOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <NavLink to="/documents-record" className={getChildLinkStyle}>
                📄 View Records
              </NavLink>
              <NavLink to="/document-generated" className={getChildLinkStyle}>
                🗂 Generated Docs
              </NavLink>
              <NavLink to="/past-residents" className={getChildLinkStyle}>
                🏛 Archive
              </NavLink>
            </div>
          </div>

          {/* 4. TRANSACTIONS (Dropdown) */}
          <div>
            <div 
              onClick={() => setTransOpen(!transOpen)} 
              className={getBoxStyle(transOpen)}
            >
              <span className="flex items-center gap-4"><span className="text-xl">💳</span> Transactions</span>
              <span className={`text-sm transition-transform duration-300 ${transOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${transOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <NavLink to="/service-fees-report" className={getChildLinkStyle}>
                💵 Fees Report
              </NavLink>
              {userRole === 'Secretary' && (
                <NavLink to="/transaction" className={getChildLinkStyle}>
                  💸 Update Fees
                </NavLink>
              )}
              <NavLink to="/online-requests" className={getChildLinkStyle}>
                🌐 Online Requests
              </NavLink>
            </div>
          </div>

          {/* 5. ADMINISTRATION (Dropdown) */}
          <div>
            <div 
              onClick={() => setAdminOpen(!adminOpen)} 
              className={getBoxStyle(adminOpen)}
            >
              <span className="flex items-center gap-4"><span className="text-xl">⚙</span> Administration</span>
              <span className={`text-sm transition-transform duration-300 ${adminOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${adminOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <NavLink to="/activity-log" className={getChildLinkStyle}>
                📝 Activity Log
              </NavLink>
              <NavLink to="/backup" className={getChildLinkStyle}>
                💾 Backup Data
              </NavLink>
              <NavLink to="/manage-account" className={getChildLinkStyle}>
                👤 Manage Account
              </NavLink>
              <NavLink to="/sms-template" className={getChildLinkStyle}>
                📨 SMS Template
              </NavLink>
              {(userRole === 'Chairman' || userRole === 'Secretary') && (
                <NavLink to="/account-registration" className={getChildLinkStyle}>
                  🧾 Registration
                </NavLink>
              )}
            </div>
          </div>

        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-[#6F7E55] bg-[#76855B]">
          <button
            onClick={logout}
            className="w-full py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl shadow-lg font-sans font-bold text-[18px] transition-transform hover:scale-[1.02] flex justify-center items-center gap-3"
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className={`flex-1 p-6 transition-all duration-300 font-sans ${
          sidebarOpen ? 'md:ml-[320px]' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export default Navigation;