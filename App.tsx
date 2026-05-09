import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PatientForm } from './components/PatientForm';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { TriageDashboard } from './components/TriageDashboard';
import AdminApproval from './components/AdminApproval';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './services/AuthContext';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-red-600 rounded-lg mb-4"></div>
          <p className="text-xl font-bold">BurnCare AI Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<PatientForm />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patient/:id" element={<PatientDetail />} />
          <Route path="/triage" element={<TriageDashboard />} />
          <Route path="/admin/approval" element={<AdminApproval />} />
        </Routes>
      </main>
    </div>
  );
};

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;