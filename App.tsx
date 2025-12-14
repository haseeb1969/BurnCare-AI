import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PatientForm } from './components/PatientForm';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { TriageDashboard } from './components/TriageDashboard';

const App: React.FC = () => {
  return (
    <Router>
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
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;