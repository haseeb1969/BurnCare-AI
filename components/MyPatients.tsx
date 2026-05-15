import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { PatientRecord } from '../types';
import { AlertCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, Stethoscope, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const MyPatients: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof PatientRecord; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchMyPatients = async () => {
      try {
        const data = await apiService.getMyPatients();
        setPatients(data);
        setFilteredPatients(data);
      } catch (err) {
        console.error("Failed to load assigned patients", err);
        toast.error("Failed to load your assigned patients");
      } finally {
        setLoading(false);
      }
    };
    fetchMyPatients();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = patients;

    // 1. Search Filter (Name or ID)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.name && p.name.toLowerCase().includes(lowerQuery)) ||
        (p.id && String(p.id).includes(lowerQuery))
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(p => (p.status || 'Active') === statusFilter);
    }

    // 3. Risk Filter
    if (riskFilter !== 'All') {
      result = result.filter(p => p.riskLevel === riskFilter);
    }

    setFilteredPatients(result);
  }, [patients, searchQuery, statusFilter, riskFilter]);

  // Sort Logic
  const sortedPatients = useMemo(() => {
    const data = [...filteredPatients];
    data.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue > bValue) comparison = 1;
      if (aValue < bValue) comparison = -1;

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return data;
  }, [filteredPatients, sortConfig]);

  const handleSort = (key: keyof PatientRecord) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (columnKey: keyof PatientRecord) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400 opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLiveRiskLevel = (p: PatientRecord) => p.currentRiskLevel || p.riskLevel || 'N/A';
  const getLiveMortality = (p: PatientRecord) => (typeof p.currentMortalityRisk === 'number' ? p.currentMortalityRisk : p.mortalityRiskPercent || 0);

  const getStatusBadge = (status: string) => {
    if (status === 'Deceased') {
      return <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Deceased</span>;
    }
    if (status === 'Discharged') {
      return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Discharged</span>;
    }
    if (status === 'Recovered') {
      return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Recovered</span>;
    }
    return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Active</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <Stethoscope className="w-12 h-12 text-blue-600 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500">Loading your assigned patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            My Assigned Patients
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Patients allocated to your care. View details, update vitals, and monitor outcomes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/register-patient"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            New Prediction
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Discharged">Discharged</option>
              <option value="Recovered">Recovered</option>
              <option value="Deceased">Deceased</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="All">All Risk</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {sortedPatients.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No patients assigned to you yet.</p>
            <Link to="/register-patient" className="text-blue-600 hover:underline mt-4 inline-block">
              Create a new patient prediction →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                    Patient {getSortIcon('name')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('timestamp')}>
                    Date Admitted {getSortIcon('timestamp')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('age')}>
                    Demographics {getSortIcon('age')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tbsa')}>
                    Burn Info {getSortIcon('tbsa')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('mortalityRiskPercent')}>
                    Risk Assessment {getSortIcon('mortalityRiskPercent')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-bold text-gray-900">{patient.name || 'Unknown'}</div>
                      <div className="text-gray-500 flex items-center gap-2 mt-1 text-xs">
                        <span className="font-mono">#{patient.id}</span>
                        {getStatusBadge(patient.status || 'Active')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(patient.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 pl-5.5 mt-0.5">
                        {new Date(patient.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="text-gray-900">{patient.age} years</div>
                      <div>{patient.gender}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="text-gray-900 font-medium">{patient.tbsa}% TBSA</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          (patient.location || 'Ward') === 'ICU' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                        }`}>
                          Location: {patient.location || 'Ward'}
                        </span>
                        {patient.inhalationInjury && (
                          <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                            + Inhalation
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRiskColor(getLiveRiskLevel(patient))}`}>
                        {getLiveRiskLevel(patient)} Risk
                      </span>
                      <div className="text-gray-500 mt-1 font-mono">
                        {getLiveMortality(patient).toFixed(1)}% {typeof patient.currentMortalityRisk === 'number' && <span className="ml-2 text-xs text-blue-500">Live</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/patient/${patient.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
