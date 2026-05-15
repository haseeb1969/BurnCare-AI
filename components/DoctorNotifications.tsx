import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { NotificationRecord, PatientRecord } from '../types';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Loader2, User2, XCircle } from 'lucide-react';

type NotificationReview = NotificationRecord & {
  patient?: PatientRecord;
};

export const DoctorNotifications: React.FC = () => {
  const [notifs, setNotifs] = useState<NotificationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMyNotifications();
      const enriched = await Promise.all(data.map(async (notification) => {
        try {
          const patient = await apiService.getPatient(notification.patient_id);
          return { ...notification, patient };
        } catch (error) {
          console.error(`Failed to load patient ${notification.patient_id}`, error);
          return { ...notification };
        }
      }));
      setNotifs(enriched);
    } catch (e) {
      console.error('Failed to load notifications', e);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleResponse = async (id: string, action: 'approve'|'reject') => {
    try {
      setProcessing(id);
      await apiService.respondNotification(id, action);
      setNotifs(prev => prev.filter(n => n.id !== id));
      toast.success(`Notification ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (e) {
      console.error('Failed to respond', e);
      toast.error('Failed to respond to notification');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="p-6">Loading notifications...</div>;

  const getLocationBadge = (location?: string) => {
    if (location === 'ICU') {
      return 'bg-red-100 text-red-800 ring-red-200';
    }
    return 'bg-green-100 text-green-800 ring-green-200';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100 mb-3">
            <Clock3 className="w-3.5 h-3.5" />
            Pending clinical review
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Notifications</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Review the live vitals, compare the recommendation against the patient record, and open the full chart before approving or rejecting relocation.
          </p>
        </div>
        <Link to="/my-patients" className="text-sm font-medium text-blue-600 hover:text-blue-700 self-start sm:self-auto">
          Back to My Patients
        </Link>
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold text-gray-900">No pending notifications.</div>
          <p className="mt-2 text-sm text-gray-500">New relocation requests will appear here for approval or rejection.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {notifs.map(n => (
            <div key={n.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${getLocationBadge(n.proposed_location)}`}>
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {n.patient?.name || `Patient #${n.patient_id}`}
                      </h2>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getLocationBadge(n.proposed_location)}`}>
                        Proposed: {n.proposed_location}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Review the live data and decide whether to accept the suggested relocation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/patient/${n.patient_id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.3fr_1fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current location</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{n.patient?.location || 'Ward'}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live risk</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {typeof n.patient?.currentMortalityRisk === 'number'
                          ? `${n.patient.currentMortalityRisk.toFixed(1)}%`
                          : n.proposedMortalityRisk ? `${n.proposedMortalityRisk.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current risk level</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{n.patient?.currentRiskLevel || 'N/A'}</div>
                    </div>
                  </div>

                  {n.vitals_snapshot && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <User2 className="h-4 w-4 text-blue-600" />
                        Latest vitals snapshot
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Temp</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{n.vitals_snapshot.temperature ?? 'N/A'}°C</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Heart rate</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{n.vitals_snapshot.heartRate ?? 'N/A'} bpm</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">SpO2</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{n.vitals_snapshot.spo2 ?? 'N/A'}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 text-gray-900 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Action required</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">Approve or reject this relocation</div>
                  <p className="mt-2 text-sm text-gray-600">
                    After approval, the patient location updates and the doctor assignment is rebalanced automatically.
                  </p>

                  <div className="mt-5 flex flex-col gap-3">
                    <button
                      disabled={processing === n.id}
                      onClick={() => handleResponse(n.id, 'approve')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {processing === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve relocation
                    </button>
                    <button
                      disabled={processing === n.id}
                      onClick={() => handleResponse(n.id, 'reject')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject relocation
                    </button>
                  </div>

                  <div className="mt-5 text-xs text-gray-500">
                    Created: {n.created_at ? new Date(n.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
