import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PatientForm } from './components/PatientForm';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { TriageDashboard } from './components/TriageDashboard';
import AdminApproval from './components/AdminApproval';
import AdminDashboard from './components/AdminDashboard';
import { ProfilePage } from './components/ProfilePage';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './services/AuthContext';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-red-600 rounded-lg mb-4 shadow-lg shadow-red-900/20"></div>
          <p className="text-xl font-bold tracking-tight">BurnCare AI Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <Routes>
          {/* Default Home Redirects based on role */}
          <Route path="/" element={
            user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/patients" replace />
          } />

          {/* Clinical Routes */}
          <Route path="/register-patient" element={<PatientForm />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patient/:id" element={<PatientDetail />} />
          <Route path="/triage" element={<TriageDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin Protected Routes */}
          <Route path="/admin/approval" element={
            user.role === 'ADMIN' ? <AdminApproval /> : <Navigate to="/" replace />
          } />
          <Route path="/admin/dashboard" element={
            user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" replace />
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
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