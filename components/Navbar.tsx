import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LayoutList, PlusCircle, ShieldCheck, LogOut, User } from 'lucide-react';
import { useAuth } from '../services/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

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
          {user?.role !== 'ADMIN' && (
            <>
              <Link
                to="/register-patient"
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/register-patient')}`}
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
            </>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              to="/admin/dashboard"
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/admin/dashboard')}`}
            >
              <ShieldCheck className="w-5 h-5 mr-3" />
              Admin Dashboard
            </Link>
          )}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link
              to="/profile"
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive('/profile')}`}
            >
              <User className="w-5 h-5 mr-3" />
              My Profile
            </Link>
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};