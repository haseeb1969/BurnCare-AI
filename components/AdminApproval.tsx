import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCheck, UserX, Clock, ShieldCheck, Mail, Phone, Briefcase, FileText } from 'lucide-react';

import { toast } from 'react-hot-toast';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  license_number: string;
  specialization: string;
  phone_number: string;
  created_at: string;
}

interface AdminApprovalProps {
  onApprove?: () => void;
}

const AdminApproval: React.FC<AdminApprovalProps> = ({ onApprove }) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/auth/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    setActioningId(userId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/auth/approve/${userId}`,
        { is_approved: approve },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      if (approve && typeof onApprove === 'function') {
        onApprove();
      }
      toast.success(approve ? 'User Approved' : 'User Rejected');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading pending requests...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" />
            User Access Management
          </h2>
          <p className="text-gray-500 mt-1">Review and approve clinical access requests for your hospital.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <span className="text-blue-700 font-bold">{pendingUsers.length}</span>
          <span className="text-blue-600 text-sm ml-2 font-medium">Pending Requests</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <UserX size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {pendingUsers.map((user) => (
          <div key={user.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {user.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{user.full_name}</h3>
                      <div className="flex items-center text-xs text-gray-400 gap-2">
                        <Clock size={12} />
                        Requested {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 mt-4">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Mail size={14} className="text-gray-400" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="font-medium">License:</span> {user.license_number}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Briefcase size={14} className="text-gray-400" />
                      <span className="font-medium">Spec:</span> {user.specialization}
                    </div>
                    {user.phone_number && (
                      <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {user.phone_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    disabled={actioningId === user.id}
                    onClick={() => handleApproval(user.id, false)}
                    className="flex-1 md:flex-none px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actioningId === user.id}
                    onClick={() => handleApproval(user.id, true)}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actioningId === user.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <UserCheck size={18} />
                    )}
                    Approve Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {pendingUsers.length === 0 && (
          <div className="text-center py-16 bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
            <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Pending Requests</h3>
            <p className="text-gray-500">All doctor registration requests have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApproval;
