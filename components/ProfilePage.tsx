import React from 'react';
import { useAuth } from '../services/AuthContext';
import { 
  User, 
  Mail, 
  Shield, 
  Hospital, 
  Phone, 
  BadgeCheck, 
  Stethoscope, 
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Clinical Profile</h1>
        <p className="text-gray-500 mt-1 text-lg">Manage your personal information and clinical credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden text-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200">
              <User size={48} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mt-1">{user.role}</p>
            
            <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
              <div className="flex items-center gap-3 text-gray-600 text-sm justify-center">
                <BadgeCheck size={16} className="text-green-500" />
                <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active Account</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-xs justify-center">
                <Clock size={14} />
                <span>Last login: Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity & Contact */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                Account Identity
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Email Address</p>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Mail size={16} className="text-gray-400" />
                  {user.email}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Contact Phone</p>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Phone size={16} className="text-gray-400" />
                  {user.phone_number || 'Not provided'}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Hospital ID</p>
                <div className="flex items-center gap-2 text-gray-700 font-mono text-sm">
                  <Hospital size={16} className="text-gray-400" />
                  {user.hospital_id}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Clinical Role</p>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <BadgeCheck size={16} className="text-gray-400" />
                  {user.role}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Credentials (only if Doctor) */}
          {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 bg-indigo-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope size={18} className="text-indigo-600" />
                  Clinical Credentials
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">License Number</p>
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <BadgeCheck size={16} className="text-indigo-500" />
                    {user.license_number || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Specialization</p>
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <Stethoscope size={16} className="text-indigo-500" />
                    {user.specialization || 'General Clinical Staff'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Assignment */}
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Current Duty Station</p>
                <h4 className="text-xl font-bold">{user.assigned_location || 'Ward'}</h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Assigned By</p>
              <h4 className="font-bold">System Admin</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
