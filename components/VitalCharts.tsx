import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { VitalEntry } from '../types';

interface VitalChartsProps {
  data: VitalEntry[];
}

export const VitalCharts: React.FC<VitalChartsProps> = ({ data }) => {
  // Format data for charts
  const chartData = data.map(entry => ({
    ...entry,
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    gcsTotal: entry.gcsEye + entry.gcsVerbal + entry.gcsMotor
  })).reverse(); // Oldest to newest for charts usually, but if array is newest first, reverse.
  // Assuming storage pushes new to top, let's check. 
  // In storage service 'updated = [patient, ...existing]'. 
  // But for vitals array, we usually push to end.
  // We will check logic in PatientDetail. Assuming data passed here is in correct chronological order for charts.
  // If data[0] is initial (oldest), then no reverse needed.

  const sortedData = [...chartData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sortedData.length < 1) return <div className="text-center p-4 text-gray-500">No vital data recorded yet.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      {/* Chart 1: Blood Pressure */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Blood Pressure (mmHg)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[40, 200]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="systolicBP" stroke="#ef4444" name="Systolic" />
              <Line type="monotone" dataKey="diastolicBP" stroke="#3b82f6" name="Diastolic" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Temperature */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Temperature (°C)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#f97316" name="Temp" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Heart Rate */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Heart Rate (bpm)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="heartRate" stroke="#ec4899" name="HR" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: SpO2 */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">SpO2 (%)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[80, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spo2" stroke="#06b6d4" name="SpO2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 5: GCS Components */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Glasgow Coma Scale</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 6]} />
              <Tooltip />
              <Legend />
              <Line type="step" dataKey="gcsEye" stroke="#8b5cf6" name="Eye (1-4)" />
              <Line type="step" dataKey="gcsVerbal" stroke="#6366f1" name="Verbal (1-5)" />
              <Line type="step" dataKey="gcsMotor" stroke="#10b981" name="Motor (1-6)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 6: Urine Output */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Urine Output (ml/hr)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="urineOutput" stroke="#eab308" name="Urine" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};