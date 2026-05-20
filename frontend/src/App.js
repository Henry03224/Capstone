import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import Navigation from "./components/Navigation";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Residents from "./pages/Residents";
import AddResident from "./pages/AddResident";
import ResidentProfile from "./pages/ResidentProfile";
import EditResidentProfile from "./pages/EditResidentProfile";
import PastResidents from "./pages/PastResidents";
import DocumentTemplate from "./pages/DocumentTemplate";
import ServicesPage from "./pages/ServicesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import PendingStatus from "./pages/PendingStatus";
import BlotterListPage from "./pages/BlotterListPage";
import AddBlotterPage from "./pages/AddBlotterPage";
import BlotterDetailPage from "./pages/BlotterDetailPage";
import DocumentsRecord from "./pages/DocumentsRecord";
import DocumentGenerated from "./pages/DocumentGenerated";
import OfficialsPage from "./pages/OfficialsPage";
import ServiceFeesReport from "./pages/ServiceFeesReport";
import UpdateServiceFees from "./pages/UpdateServiceFees";
import OnlineRequestsPage from "./pages/OnlineRequestsPage";
import ActivityLog from "./pages/ActivityLog";
import BackupPage from "./pages/BackupPage";
import ManageAccount from "./pages/ManageAccount";
import SMSTemplate from "./pages/SMSTemplate";
import AccountRegistration from "./pages/AccountRegistration";
import PurokResidents from "./pages/PurokResidents";
import PostAnnouncement from "./pages/PostAnnouncement";
import AnnouncementsTable from "./pages/AnnouncementsTable";
import CreateServicesPage from "./pages/CreateServicesPage";

// --------------------------
// Protected Route
// --------------------------
function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" replace />;
}

// --------------------------
// App Routes
// --------------------------
function AppRoutes() {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><Navigation><Dashboard /></Navigation></ProtectedRoute>} />

      <Route path="/residents" element={<ProtectedRoute><Navigation><Residents /></Navigation></ProtectedRoute>} />
      <Route path="/addResident" element={<ProtectedRoute><Navigation><AddResident /></Navigation></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Navigation><ResidentProfile /></Navigation></ProtectedRoute>} />
      <Route path="/edit-resident" element={<ProtectedRoute><Navigation><EditResidentProfile /></Navigation></ProtectedRoute>} />
      <Route path="/past-residents" element={<ProtectedRoute><Navigation><PastResidents /></Navigation></ProtectedRoute>} />
      <Route path="/officials" element={<ProtectedRoute><Navigation><OfficialsPage /></Navigation></ProtectedRoute>} />

      {/* 📢 Announcements */}
      <Route path="/post-announcement" element={<ProtectedRoute><Navigation><PostAnnouncement /></Navigation></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Navigation><AnnouncementsTable /></Navigation></ProtectedRoute>} />

      {/* Services */}
      <Route path="/services/:type" element={<ProtectedRoute><Navigation><ServicesPage /></Navigation></ProtectedRoute>} />

      {/* Documents */}
      <Route path="/templates/:templateType" element={<ProtectedRoute><Navigation><DocumentTemplate /></Navigation></ProtectedRoute>} />
      <Route path="/documents-record" element={<ProtectedRoute><Navigation><DocumentsRecord /></Navigation></ProtectedRoute>} />
      <Route path="/document-generated" element={<ProtectedRoute><Navigation><DocumentGenerated /></Navigation></ProtectedRoute>} />

      {/* Finance */}
      <Route path="/service-fees-report" element={<ProtectedRoute><Navigation><ServiceFeesReport /></Navigation></ProtectedRoute>} />
      <Route path="/transaction" element={<ProtectedRoute><Navigation><UpdateServiceFees /></Navigation></ProtectedRoute>} />

      {/* Blotter */}
      <Route path="/complaints" element={<ProtectedRoute><Navigation><ComplaintsPage /></Navigation></ProtectedRoute>} />
      <Route path="/blotters" element={<ProtectedRoute><Navigation><BlotterListPage /></Navigation></ProtectedRoute>} />
      <Route path="/add-blotter" element={<ProtectedRoute><Navigation><AddBlotterPage /></Navigation></ProtectedRoute>} />
      <Route path="/blotter/:id" element={<ProtectedRoute><Navigation><BlotterDetailPage /></Navigation></ProtectedRoute>} />

      {/* Online */}
      <Route path="/online-requests" element={<ProtectedRoute><Navigation><OnlineRequestsPage /></Navigation></ProtectedRoute>} />
      <Route path="/pending-status" element={<ProtectedRoute><Navigation><PendingStatus /></Navigation></ProtectedRoute>} />
      <Route path="/online-services" element={<CreateServicesPage />} />

      {/* System */}
      <Route path="/activity-log" element={<ProtectedRoute><Navigation><ActivityLog /></Navigation></ProtectedRoute>} />
      <Route path="/backup" element={<ProtectedRoute><Navigation><BackupPage /></Navigation></ProtectedRoute>} />
      <Route path="/manage-account" element={<ProtectedRoute><Navigation><ManageAccount /></Navigation></ProtectedRoute>} />
      <Route path="/sms-template" element={<ProtectedRoute><Navigation><SMSTemplate /></Navigation></ProtectedRoute>} />
      <Route path="/account-registration" element={<ProtectedRoute><Navigation><AccountRegistration /></Navigation></ProtectedRoute>} />

      {/* Purok */}
      <Route path="/purok/:purok" element={<ProtectedRoute><Navigation><PurokResidents /></Navigation></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

// --------------------------
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
