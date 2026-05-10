import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Users, 
  Bed, 
  MapPin, 
  Activity, 
  Settings, 
  Save, 
  Loader2,
  ArrowRightLeft
} from 'lucide-react';
import { User, PatientRecord, Hospital } from '../types';
import AdminApproval from './AdminApproval';
import { toast } from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'patients' | 'approvals' | 'settings'>('staff');
  
  // Settings State
  const [newBeds, setNewBeds] = useState(0);
  const [isUpdatingBeds, setIsUpdatingBeds] = useState(false);
  
  // Action Loading State
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, patientsRes, hospitalRes] = await Promise.all([
        axios.get('http://localhost:8000/admin/users', { headers }),
        axios.get('http://localhost:8000/patients/', { headers }),
        axios.get('http://localhost:8000/hospitals/me', { headers })
      ]);
      
      setUsers(usersRes.data);
      setPatients(patientsRes.data);
      setHospital(hospitalRes.data);
      setNewBeds(hospitalRes.data.total_icu_beds);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBeds = async () => {
    setIsUpdatingBeds(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:8000/hospitals/beds', 
        { total_icu_beds: newBeds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh all data to show updated patient locations instantly
      await fetchData();
      
      toast.success('ICU Capacity Updated Successfully');
    } catch (err) {
      toast.error('Failed to update capacity');
    } finally {
      setIsUpdatingBeds(false);
    }
  };

  const handleUserLocationChange = async (userId: string, newLocation: string) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/admin/users/${userId}`, 
        { assigned_location: newLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, assigned_location: newLocation } : u
      ));
      
      toast.success(`Staff assigned to ${newLocation}`);
    } catch (err: any) {
      console.error('Failed to update assignment:', err.response?.data || err.message);
      toast.error('Failed to update assignment');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  const pendingCount = users.filter(u => !u.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" />
            Hospital Administration
          </h2>
          <p className="text-gray-500 mt-1">Manage staff, monitor patients, and configure hospital resources.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'staff', label: `Staff & Doctors (${users.filter(u => u.is_approved && u.role !== 'ADMIN').length})`, icon: Users },
          { id: 'patients', label: `Patients Overview (${patients.length})`, icon: Activity },
          { id: 'approvals', label: 'Pending Approvals', icon: Clock, count: pendingCount },
          { id: 'settings', label: 'Hospital Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'staff' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Staff Member</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Current Assignment</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Update Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.filter(u => u.is_approved && u.role !== 'ADMIN').map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-400">{user.specialization || 'General Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                          <MapPin size={14} className="text-blue-500" />
                          <span className={user.assigned_location === 'ICU' ? 'text-red-600' : 'text-blue-600'}>
                            {user.assigned_location || 'Ward'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.assigned_location === 'ICU' ? (
                            <button
                              onClick={() => handleUserLocationChange(user.id, 'Ward')}
                              disabled={actionLoading === user.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />}
                              Assign to Ward
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserLocationChange(user.id, 'ICU')}
                              disabled={actionLoading === user.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />}
                              Assign to ICU
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Admission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map(patient => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {patient.name}
                        <div className="text-xs text-gray-400">ID: {patient.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.location === 'ICU' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          <Bed size={12} className="mr-1" />
                          {patient.location || 'Ward'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${
                            patient.riskLevel === 'Critical' || patient.riskLevel === 'High' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {patient.riskLevel}
                          </span>
                          {patient.currentMortalityRisk !== null && (
                            <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                              <Activity size={10} /> Live Monitoring
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(patient.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                        No patients currently registered in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <AdminApproval />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Bed size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Hospital Capacity</h3>
                  <p className="text-sm text-gray-500">Configure total resource limits for clinical triage.</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-bold text-gray-700">Total ICU Beds</label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                      Current Limit: {hospital?.total_icu_beds || 0}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Bed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        min="0"
                        value={newBeds}
                        onChange={(e) => setNewBeds(parseInt(e.target.value) || 0)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-xl"
                      />
                    </div>
                    <button
                      onClick={handleUpdateBeds}
                      disabled={isUpdatingBeds}
                      className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingBeds ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Update Capacity
                    </button>
                  </div>
                  <div className="mt-6 flex items-start gap-3 p-4 bg-white/60 rounded-xl border border-blue-100/50">
                    <Activity size={16} className="text-blue-500 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This limit is used by the AI triage engine to calculate clinical benefit and admission priority. 
                      Changes are applied in real-time to the Triage Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
