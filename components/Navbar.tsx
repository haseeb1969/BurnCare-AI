import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, LayoutList, PlusCircle, Settings, HelpCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">BurnCare AI</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col py-6 overflow-y-auto">
        <nav className="space-y-1">
          <Link
            to="/"
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/')}`}
          >
            <PlusCircle className="w-5 h-5 mr-3" />
            New Prediction
          </Link>
          <Link
            to="/patients"
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/patients')}`}
          >
            <LayoutList className="w-5 h-5 mr-3" />
            Patient Registry
          </Link>
          <Link
            to="/triage"
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/triage')}`}
          >
            <Activity className="w-5 h-5 mr-3" />
            Triage Dashboard
          </Link>
        </nav>
      </div>

    </aside>
  );
};