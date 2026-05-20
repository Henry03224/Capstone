import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";

// Layout
import Navigation from "./components/Navigation";

// Public Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Core Pages
import Dashboard from "./pages/Dashboard";
import Residents from "./pages/Residents";
import AddResident from "./pages/AddResident";
import ResidentProfile from "./pages/ResidentProfile";
import EditResidentProfile from "./pages/EditResidentProfile";

// Documents & Services
import DocumentTemplate from "./pages/DocumentTemplate";
import ServicesPage from "./pages/ServicesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import PendingStatus from "./pages/PendingStatus";

// Blotter
import BlotterListPage from "./pages/BlotterListPage";
import AddBlotterPage from "./pages/AddBlotterPage";
import BlotterDetailPage from "./pages/BlotterDetailPage";

// Document Records
import DocumentsRecord from "./pages/DocumentsRecord";
import DocumentGenerated from "./pages/DocumentGenerated";

// Residents
import PastResidents from "./pages/PastResidents";

// Officials
import OfficialsPage from "./pages/OfficialsPage";

// Service Fees
import ServiceFeesReport from "./pages/ServiceFeesReport";
import UpdateServiceFees from "./pages/UpdateServiceFees";

// Online Requests
import OnlineRequestsPage from "./pages/OnlineRequestsPage";

// System Settings
import ActivityLog from "./pages/ActivityLog";
import BackupPage from "./pages/BackupPage";
import ManageAccount from "./pages/ManageAccount";
import SMSTemplate from "./pages/SMSTemplate";
import AccountRegistration from "./pages/AccountRegistration"; // ✅ NEW

// -------------------------
// Protected Route Wrapper
// -------------------------
function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  return user ? (
    <div className="flex">
      <Navigation />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  ) : (
    <Navigate to="/login" replace />
  );
}

// -------------------------
// App Routes
// -------------------------
function AppRoutes() {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/register"
        element={!user ? <Register /> : <Navigate to="/dashboard" replace />}
      />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/residents" element={<ProtectedRoute><Residents /></ProtectedRoute>} />
      <Route path="/addResident" element={<ProtectedRoute><AddResident /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ResidentProfile /></ProtectedRoute>} />
      <Route path="/edit-resident" element={<ProtectedRoute><EditResidentProfile /></ProtectedRoute>} />

      {/* Past Residents */}
      <Route path="/past-residents" element={<ProtectedRoute><PastResidents /></ProtectedRoute>} />

      {/* Officials */}
      <Route path="/officials" element={<ProtectedRoute><OfficialsPage /></ProtectedRoute>} />

      {/* Services */}
      <Route path="/services/:type" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />

      {/* Templates */}
      <Route path="/templates/:templateType" element={<ProtectedRoute><DocumentTemplate /></ProtectedRoute>} />

      {/* Documents */}
      <Route path="/documents-record" element={<ProtectedRoute><DocumentsRecord /></ProtectedRoute>} />
      <Route path="/document-generated" element={<ProtectedRoute><DocumentGenerated /></ProtectedRoute>} />

      {/* Fees */}
      <Route path="/service-fees-report" element={<ProtectedRoute><ServiceFeesReport /></ProtectedRoute>} />
      <Route path="/transaction" element={<ProtectedRoute><UpdateServiceFees /></ProtectedRoute>} />

      {/* Complaints */}
      <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />

      {/* Blotter */}
      <Route path="/blotters" element={<ProtectedRoute><BlotterListPage /></ProtectedRoute>} />
      <Route path="/add-blotter" element={<ProtectedRoute><AddBlotterPage /></ProtectedRoute>} />
      <Route path="/blotter/:id" element={<ProtectedRoute><BlotterDetailPage /></ProtectedRoute>} />

      {/* Online Requests */}
      <Route path="/online-requests" element={<ProtectedRoute><OnlineRequestsPage /></ProtectedRoute>} />

      {/* Pending */}
      <Route path="/pending-status" element={<ProtectedRoute><PendingStatus /></ProtectedRoute>} />

      {/* System Settings */}
      <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
      <Route path="/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
      <Route path="/manage-account" element={<ProtectedRoute><ManageAccount /></ProtectedRoute>} />
      <Route path="/sms-template" element={<ProtectedRoute><SMSTemplate /></ProtectedRoute>} />

      {/* ✅ NEW: Account Registration */}
      <Route
        path="/account-registration"
        element={<ProtectedRoute><AccountRegistration /></ProtectedRoute>}
      />

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

// -------------------------
// App Wrapper
// -------------------------
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
