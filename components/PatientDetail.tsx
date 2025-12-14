import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { PatientRecord, VitalEntry } from '../types';
import { RiskChart } from './RiskChart';
import { BodyMap } from './BodyMap';
import { VitalCharts } from './VitalCharts';
import { ArrowLeft, User, Activity, Flame, CheckCircle, Clock, Plus, AlertOctagon, ShieldCheck, Save, Loader2 } from 'lucide-react';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientRecord | undefined>(undefined);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Status Management State
  const [editStatus, setEditStatus] = useState<PatientRecord['status']>('Active');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // New Vital Form State
  const [newVital, setNewVital] = useState<Omit<VitalEntry, 'timestamp'>>({
    temperature: 37,
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 80,
    spo2: 98,
    urineOutput: 50,
    gcsEye: 4,
    gcsVerbal: 5,
    gcsMotor: 6
  });

  // Load patient data
  useEffect(() => {
    const fetchPatient = async () => {
      if (id) {
        try {
          const data = await apiService.getPatient(id);
          setPatient(data);
          if (data) {
            setEditStatus(data.status || 'Active');
          }
        } catch (err) {
          console.error(`Patient ID ${id} not found`, err);
        }
      }
    };
    fetchPatient();
  }, [id, refreshTrigger]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (updateMessage) {
      const timer = setTimeout(() => setUpdateMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateMessage]);

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
        <p>Patient not found.</p>
        <Link to="/patients" className="text-blue-600 mt-4 hover:underline">Return to list</Link>
      </div>
    );
  }

  // Derived state for UI logic
  const savedStatus = patient.status || 'Active';
  const isActive = savedStatus === 'Active';
  const isDeceased = savedStatus === 'Deceased';
  const isDischarged = savedStatus === 'Discharged';
  const isRecovered = savedStatus === 'Recovered';

  const isMonitoringActive = isActive;
  // Button is enabled only if the dropdown value differs from the saved value
  const hasStatusChanged = editStatus !== savedStatus;

  const handleStatusUpdate = async () => {
    if (!id || !patient) return;

    setIsUpdating(true);
    setUpdateMessage(null);
    console.log(`Attempting to update status for ID: ${id} to ${editStatus}`);

    try {
      await apiService.updatePatient(id, { status: editStatus });
      const freshData = await apiService.getPatient(id);
      setPatient(freshData);
      setUpdateMessage({ text: 'Status updated successfully', type: 'success' });
    } catch (e) {
      console.error("Update failed", e);
      setUpdateMessage({ text: 'Failed to save status', type: 'error' });
      setEditStatus(savedStatus);
    }
    setIsUpdating(false);
  };

  const handleVitalChange = (field: keyof typeof newVital, value: number) => {
    setNewVital(prev => ({ ...prev, [field]: value }));
  };

  const submitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !patient) return;

    const entry: VitalEntry = {
      ...newVital,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...(patient.hourlyVitals || []), entry];

    try {
      await apiService.updatePatient(id, { hourlyVitals: updatedHistory });
      setRefreshTrigger(prev => prev + 1);
      setShowVitalsForm(false);
    } catch (e) {
      console.error('Failed to save vital entry', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation & Status Control */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link to="/patients" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Registry
        </Link>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap pl-2">Patient Status:</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as PatientRecord['status'])}
              className={`block rounded-md border-0 py-1.5 pl-3 pr-8 text-sm font-semibold shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset cursor-pointer ${editStatus === 'Active' ? 'text-blue-700 ring-blue-200 bg-blue-50 focus:ring-blue-500' :
                editStatus === 'Deceased' ? 'text-red-700 ring-red-200 bg-red-50 focus:ring-red-500' :
                  editStatus === 'Recovered' ? 'text-emerald-700 ring-emerald-200 bg-emerald-50 focus:ring-emerald-500' :
                    'text-green-700 ring-green-200 bg-green-50 focus:ring-green-500'
                }`}
            >
              <option value="Active">Active</option>
              <option value="Discharged">Discharged</option>
              <option value="Recovered">Recovered</option>
              <option value="Deceased">Deceased</option>
            </select>

            <button
              onClick={handleStatusUpdate}
              disabled={!hasStatusChanged || isUpdating}
              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white transition-colors ${hasStatusChanged
                ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Update
            </button>
          </div>
          {updateMessage && (
            <span className={`text-xs font-medium ${updateMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {updateMessage.text}
            </span>
          )}
        </div>
      </div>

      {/* Status Banner (if not Active) */}
      {!isActive && (
        <div className={`mb-6 px-4 py-3 rounded-lg flex items-center shadow-lg text-white ${isDeceased ? 'bg-gray-800' : 'bg-green-700'
          }`}>
          {isDeceased && <AlertOctagon className="w-6 h-6 mr-3 text-red-400" />}
          {(isDischarged || isRecovered) && <ShieldCheck className="w-6 h-6 mr-3 text-green-300" />}
          <div>
            <p className="font-bold">
              {isDeceased ? 'Patient Deceased' : isRecovered ? 'Patient Recovered' : 'Patient Discharged'}
            </p>
            <p className="text-sm opacity-90">
              {isDeceased ? 'Monitoring stopped. Clinical records are locked.' : 'Care completed. Monitoring inactive.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Clinical Data */}
        <div className="lg:col-span-1 space-y-6">

          {/* Patient Profile */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  Patient Profile
                </h3>
                <span className="text-xs text-gray-400 font-mono">#{patient.id}</span>
              </div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{patient.name || "Unknown Patient"}</h2>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Age</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.age}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.gender}</dd>
                </div>
              </dl>
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm font-medium text-gray-500 mb-1">Comorbidities</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {patient.comorbidities || "None reported"}
                </dd>
              </div>
            </div>
          </div>

          {/* Burn Info & Map */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                Burn Profile
              </h3>
              <dl className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <span className="block text-xs text-gray-500 uppercase">TBSA</span>
                    <span className="text-xl font-bold text-gray-900">{patient.tbsa}%</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 uppercase text-right">Inhalation</span>
                    <span className={`block text-sm font-bold text-right ${patient.inhalationInjury ? 'text-red-600' : 'text-green-600'}`}>
                      {patient.inhalationInjury ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-lg p-2 flex justify-center bg-gray-50/50">
                  <div className="scale-75 origin-top -mb-20">
                    <BodyMap selectedRegions={patient.burnedRegions || []} readOnly={true} />
                  </div>
                </div>

                <div>
                  <dt className="text-xs text-gray-500 uppercase mt-4">Depth</dt>
                  <dd className="text-sm font-medium text-gray-900">{patient.burnDepth}</dd>
                </div>
              </dl>
            </div>
          </div>

        </div>

        {/* Right Column: Labs, GCS & Analysis */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hourly Monitoring Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg border-t-4 border-blue-600">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Clinical Monitoring
                </h3>
                {isMonitoringActive && (
                  <button
                    onClick={() => setShowVitalsForm(!showVitalsForm)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Entry
                  </button>
                )}
              </div>

              {/* Add Vitals Form */}
              {showVitalsForm && isMonitoringActive && (
                <form onSubmit={submitVitals} className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Record New Vitals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Temp (°C)</label>
                      <input type="number" step="0.1" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.temperature} onChange={e => handleVitalChange('temperature', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">HR (bpm)</label>
                      <input type="number" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.heartRate} onChange={e => handleVitalChange('heartRate', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Sys BP</label>
                      <input type="number" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.systolicBP} onChange={e => handleVitalChange('systolicBP', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Dia BP</label>
                      <input type="number" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.diastolicBP} onChange={e => handleVitalChange('diastolicBP', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">SpO2 (%)</label>
                      <input type="number" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.spo2} onChange={e => handleVitalChange('spo2', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Urine (ml/hr)</label>
                      <input type="number" required className="mt-1 block w-full rounded border-gray-300 text-sm p-1"
                        value={newVital.urineOutput} onChange={e => handleVitalChange('urineOutput', parseFloat(e.target.value))} />
                    </div>
                    <div className="col-span-2 grid grid-cols-3 gap-2 bg-white p-2 rounded border border-gray-200">
                      <div className="col-span-3 text-xs font-semibold text-gray-500">GCS Scores</div>
                      <div>
                        <label className="block text-[10px] text-gray-600">Eye</label>
                        <input type="number" min="1" max="4" required className="block w-full rounded border-gray-300 text-sm p-1"
                          value={newVital.gcsEye} onChange={e => handleVitalChange('gcsEye', parseInt(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-600">Verbal</label>
                        <input type="number" min="1" max="5" required className="block w-full rounded border-gray-300 text-sm p-1"
                          value={newVital.gcsVerbal} onChange={e => handleVitalChange('gcsVerbal', parseInt(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-600">Motor</label>
                        <input type="number" min="1" max="6" required className="block w-full rounded border-gray-300 text-sm p-1"
                          value={newVital.gcsMotor} onChange={e => handleVitalChange('gcsMotor', parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowVitalsForm(false)} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Entry</button>
                  </div>
                </form>
              )}

              {/* Charts */}
              <VitalCharts data={patient.hourlyVitals || []} />
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-indigo-500">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Real-time AI Risk Monitoring
                </h3>
                {patient.sofaScore !== undefined && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    SOFA Score: {patient.sofaScore}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-8 mb-6">
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Phase 1: Admission */}
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Admission Baseline</h4>
                    <RiskChart percent={patient.mortalityRiskPercent} />
                    <div className="mt-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold 
                          ${patient.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                          patient.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}`}>
                        {patient.riskLevel} Risk
                      </span>
                    </div>
                  </div>

                  {/* Phase 2: Real-time */}
                  <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-bl">LIVE AI</div>
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4">Current Status (LSTM)</h4>

                    {typeof patient.currentMortalityRisk === 'number' ? (
                      <>
                        <RiskChart percent={patient.currentMortalityRisk} />
                        <div className="mt-4 text-center flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold 
                              ${patient.currentRiskLevel === 'High' ? 'bg-red-100 text-red-800' :
                              patient.currentRiskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'}`}>
                            {patient.currentRiskLevel} Risk
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-blue-300">
                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">{patient.currentRiskLevel || "Awaiting Data (Min 4h)"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/3">
                <div className="prose prose-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-2">Clinical Reasoning:</p>
                  <p className="leading-relaxed">{patient.reasoning}</p>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Clinical Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {patient.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        <span className="mr-2 text-blue-500 font-bold">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end text-xs text-gray-400">
            Patient Admitted: {new Date(patient.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </div >
  );
};