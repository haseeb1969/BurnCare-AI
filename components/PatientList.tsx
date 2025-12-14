import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { PatientRecord } from '../types';
import { User, Calendar, AlertCircle, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof PatientRecord; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await apiService.getPatients();
        setPatients(data);
        setFilteredPatients(data);
      } catch (err) {
        console.error("Failed to load patients", err);
      }
    };
    fetchPatients();
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

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue === bValue) return 0;

      // Determine comparison result
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
    // Default to Active
    return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Active</span>;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Patient Registry</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all patients including their burn characteristics and AI-predicted mortality risk.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Add Patient
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-40">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-8 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Recovered">Recovered</option>
              <option value="Discharged">Discharged</option>
              <option value="Deceased">Deceased</option>
            </select>
          </div>
          <div className="relative w-full md:w-40">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white cursor-pointer"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low Risk</option>
              <option value="Moderate">Moderate Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Patient
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer group select-none hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center">
                        Date Admitted
                        {getSortIcon('timestamp')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer group select-none hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('age')}
                    >
                      <div className="flex items-center">
                        Demographics
                        {getSortIcon('age')}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Burn Info</th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer group select-none hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('mortalityRiskPercent')}
                    >
                      <div className="flex items-center">
                        Risk Assessment
                        {getSortIcon('mortalityRiskPercent')}
                      </div>
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedPatients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                        {patients.length === 0
                          ? "No patient records found. Start a new prediction."
                          : "No patients match your search criteria."}
                      </td>
                    </tr>
                  )}
                  {sortedPatients.map((patient) => (
                    <tr key={patient.id} className={`hover:bg-gray-50 transition-colors ${patient.status === 'Deceased' ? 'bg-gray-50 opacity-75' : ''}`}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="font-bold text-gray-900">{patient.name || "Unknown"}</div>
                        <div className="text-gray-500 flex items-center gap-2 mt-1 text-xs">
                          <span className="font-mono">#{patient.id}</span>
                          {getStatusBadge(patient.status || 'Active')}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(patient.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-400 pl-5.5 mt-0.5">
                          {new Date(patient.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="text-gray-900">{patient.age} years</div>
                        <div>{patient.gender}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="text-gray-900 font-medium">{patient.tbsa}% TBSA</div>
                        <div className="flex items-center gap-1">
                          {patient.inhalationInjury && (
                            <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                              + Inhalation
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRiskColor(patient.riskLevel)}`}>
                          {patient.riskLevel} Risk
                        </span>
                        <div className="text-gray-500 mt-1 font-mono">
                          {patient.mortalityRiskPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2 items-center">
                          <Link
                            to={`/patient/${patient.id}`}
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            View
                          </Link>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this record?')) {
                                try {
                                  await apiService.deletePatient(patient.id);
                                  setPatients(prev => prev.filter(p => p.id !== patient.id));
                                  setFilteredPatients(prev => prev.filter(p => p.id !== patient.id));
                                } catch (e) {
                                  alert('Failed to delete record');
                                }
                              }
                            }}
                            className="inline-flex items-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100 border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
