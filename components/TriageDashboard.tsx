import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { triageService } from '../services/triageService';
import { PatientRecord, ManualOverride, TriageEntry } from '../types';
import { Activity, AlertTriangle, Bed, UserCheck, UserX, Lock, Unlock, ShieldAlert } from 'lucide-react';

export const TriageDashboard: React.FC = () => {
    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalBeds, setTotalBeds] = useState(5);
    const [overrides, setOverrides] = useState<Record<string, ManualOverride>>({});

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const data = await apiService.getPatients();
            setPatients(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleOverride = (id: string, type: ManualOverride) => {
        setOverrides(prev => {
            const next = { ...prev };
            if (next[id] === type) {
                delete next[id]; // Toggle off if same
            } else {
                next[id] = type;
            }
            return next;
        });
    };

    // Run Allocation
    const allocation = useMemo(() => {
        return triageService.runAllocation(patients, totalBeds, overrides);
    }, [patients, totalBeds, overrides]);

    // Stats
    const bedsUsed = allocation.filter(a => a.allocation === 'ICU').length;
    const totalLivesSavedBase = allocation.reduce((acc, curr) => acc + (curr.survivalProb / 100), 0);
    // This is just sum of survival. 
    // Real "Saved" metric would be: sum(P(Survive|Assigned)).
    // If assigned ICU -> P(Survive|ICU). If Ward -> P(Survive|Ward).
    // But we didn't expose P(Survive|Ward) in the entry.
    // Let's rely on Benefit Score total as a proxy for "Optimization Quality".
    const totalBenefit = allocation.filter(a => a.allocation === 'ICU').reduce((acc, curr) => acc + curr.benefitScore, 0);

    if (loading) return <div className="p-8 text-center">Loading Registry...</div>;

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="text-blue-600" />
                            ICU Triage Dashboard
                        </h2>
                        <p className="text-gray-500 mt-1">
                            AI-Optimized Resource Allocation based on Clinical Benefit
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-500 uppercase">ICU Capacity</span>
                            <div className="flex items-center gap-3">
                                <Bed className="w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={totalBeds}
                                    onChange={(e) => setTotalBeds(parseInt(e.target.value) || 0)}
                                    className="w-20 p-1 border rounded text-lg font-bold text-center"
                                />
                            </div>
                        </div>
                        <div className="h-8 w-px bg-gray-300 mx-2"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Utilization</span>
                            <span className={`text-lg font-bold ${bedsUsed > totalBeds ? 'text-red-600' : 'text-green-600'}`}>
                                {bedsUsed} / {totalBeds}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Allocation Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Mortality Risk</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                                    Benefit Score
                                    <span className="ml-1 text-gray-400 font-normal normal-case">(Delta Vitality)</span>
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Recommendation</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Manual Override</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {allocation.map((entry) => (
                                <tr key={entry.patientId} className={`hover:bg-gray-50 transition-colors ${entry.allocation === 'ICU' ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {entry.patientName}
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">ID: {entry.patientId.slice(0, 6)}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${entry.mortalityRisk > 70 ? 'bg-red-500' : entry.mortalityRisk > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                    style={{ width: `${entry.mortalityRisk}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold">{entry.mortalityRisk.toFixed(1)}%</span>
                                        </div>
                                        <div className="mt-1 flex justify-end">
                                            {entry.riskSource === 'Live' ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 animate-pulse">
                                                    <Activity className="w-3 h-3 mr-1" />
                                                    Live
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                                    Base
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700">{entry.benefitScore.toFixed(1)}</span>
                                            <span className="text-xs text-gray-400">
                                                {entry.benefitScore > 15 ? 'High Priority' : 'Low Priority'}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        {entry.allocation === 'ICU' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                <UserCheck className="w-3 h-3 mr-1" />
                                                Admit to ICU
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                <UserX className="w-3 h-3 mr-1" />
                                                General Ward
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleOverride(entry.patientId, 'ForceICU')}
                                                className={`p-1.5 rounded-md border transition-colors ${entry.override === 'ForceICU'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                                    }`}
                                                title="Force ICU Admission"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => toggleOverride(entry.patientId, 'ForceWard')}
                                                className={`p-1.5 rounded-md border transition-colors ${entry.override === 'ForceWard'
                                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-red-400 hover:text-red-600'
                                                    }`}
                                                title="Force Ward Transfer"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                            </button>

                                            {entry.override && (
                                                <button
                                                    onClick={() => toggleOverride(entry.patientId, entry.override)} // Toggles off
                                                    className="text-xs text-gray-400 hover:text-gray-600 ml-2 underline"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {allocation.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No active patients found in registry.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
