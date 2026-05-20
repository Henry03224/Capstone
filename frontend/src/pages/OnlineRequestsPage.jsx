// File: OnlineRequestsPage.js
import React, { useState, Suspense, lazy } from "react";

// 1. Import existing pages
const ResidentsPage = lazy(() => import("./ResidentsPage"));
const RequestsPage = lazy(() => import("./RequestsPage"));

// 2. Import your NEW page
const CreateServicesPage = lazy(() => import("./CreateServicesPage"));

const OnlineRequestsPage = () => {
  // Default starts on "residents"
  const [activeTab, setActiveTab] = useState("residents");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-teal-600">
        Online Services & Requests (Realtime)
      </h1>

      {/* TABS NAVIGATION */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={() => setActiveTab("residents")}
          className={`px-4 py-2 rounded ${
            activeTab === "residents"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Online Services Access
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded ${
            activeTab === "requests"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Service Requests
        </button>

        {/* 3. THIS IS THE BUTTON YOU CLICK TO SEE THE FORM */}
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded ${
            activeTab === "create"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Create Services
        </button>
      </div>

      {/* CONTENT AREA */}
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        }
      >
        {activeTab === "residents" && <ResidentsPage />}
        {activeTab === "requests" && <RequestsPage />}
        
        {/* 4. SHOW THE FORM WHEN TAB IS 'create' */}
        {activeTab === "create" && <CreateServicesPage />}
      </Suspense>
    </div>
  );
};

export default OnlineRequestsPage;