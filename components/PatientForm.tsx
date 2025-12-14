import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gender, BurnDepth, PatientInput, PatientRecord, VitalEntry } from '../types';
import { apiService } from '../services/apiService';
import { BodyMap, calculateTBSA } from './BodyMap';
import { Loader2, AlertTriangle, Wind, Activity, Heart, Brain, TestTube, Thermometer, Droplets, HelpCircle } from 'lucide-react';

export const PatientForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientInput>({
    name: '',
    age: 45,
    gender: Gender.Male,
    tbsa: 0,
    burnedRegions: [],
    burnDepth: BurnDepth.PartialThickness,
    inhalationInjury: false,
    comorbidities: '',

    // Hemodynamics
    heartRate: 80,
    systolicBP: 120,
    diastolicBP: 80,
    temperature: 37.0,

    // Respiratory
    spo2: 98,
    pao2: 95,
    fio2: 21,

    // Renal
    urineOutput: 50,

    // Labs
    platelets: 250,
    bilirubin: 0.8,
    creatinine: 0.9,

    // GCS
    gcsEye: 4,
    gcsVerbal: 5,
    gcsMotor: 6
  });

  // Automatically update TBSA when regions change
  useEffect(() => {
    const calculated = calculateTBSA(formData.burnedRegions);
    setFormData(prev => ({ ...prev, tbsa: calculated }));
  }, [formData.burnedRegions]);

  const handleChange = (field: keyof PatientInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegionChange = (regions: string[]) => {
    setFormData(prev => ({ ...prev, burnedRegions: regions }));
  };

  const calculateMAP = () => {
    return Math.round((formData.diastolicBP * 2 + formData.systolicBP) / 3);
  };

  const calculateGCS = () => {
    return formData.gcsEye + formData.gcsVerbal + formData.gcsMotor;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Removed window.confirm due to sandbox restrictions

    setLoading(true);
    try {
      const newRecord = await apiService.createPatient(formData);
      navigate(`/patient/${newRecord.id}`);
    } catch (error) {
      console.error(error);
      console.error('Failed to create patient record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Patient Assessment</h1>
        <p className="text-gray-500 mt-2">Enter complete clinical parameters. Use the body map to estimate TBSA via Rule of Nines.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6 space-y-8">

        {/* Section 1: Demographics & Burn Info */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Demographics & Burn Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                min="0"
                max="120"
                required
                value={formData.age}
                onChange={(e) => handleChange('age', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                {Object.values(Gender).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Burn Depth</label>
              <select
                value={formData.burnDepth}
                onChange={(e) => handleChange('burnDepth', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                {Object.values(BurnDepth).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Inhalation Injury Checkbox - Moved Up */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inhalationInjury}
                onChange={(e) => handleChange('inhalationInjury', e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <div className="flex items-center text-gray-900 font-medium">
                <Wind className="w-5 h-5 mr-3 text-blue-500" />
                Inhalation Injury Present?
              </div>
            </label>
          </div>

          {/* Body Map Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-gray-700">Burn Surface Area Calculator (Rule of Nines)</label>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 shadow-xl">
                    <p className="font-bold text-gray-200 mb-1">Wallace Rule of Nines Estimate:</p>
                    <ul className="list-disc pl-3 space-y-1 text-gray-300 mb-2">
                      <li>Head & Neck: 9%</li>
                      <li>Each Arm: 9%</li>
                      <li>Anterior Torso: 18%</li>
                      <li>Posterior Torso: 18%</li>
                      <li>Each Leg: 18%</li>
                      <li>Perineum: 1%</li>
                    </ul>
                    <a
                      href="https://en.wikipedia.org/wiki/Wallace_rule_of_nines"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline block mt-1"
                    >
                      Read detailed guide ↗
                    </a>
                    <div className="absolute left-1.5 top-full border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                <span className="text-xs text-gray-500">Calculated TBSA:</span>
                <span className="text-xl font-bold text-red-600">{formData.tbsa}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Click on body regions to mark them as burned. The calculator automatically sums the affected surface area.
            </p>
            <BodyMap
              selectedRegions={formData.burnedRegions}
              onChange={handleRegionChange}
            />
          </div>
        </div>

        {/* Section 2: Vitals & Hemodynamics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
            <Heart className="w-5 h-5 text-red-500" />
            Vitals & Hemodynamics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
              <input
                type="number"
                value={formData.heartRate}
                onChange={(e) => handleChange('heartRate', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Systolic BP</label>
              <input
                type="number"
                value={formData.systolicBP}
                onChange={(e) => handleChange('systolicBP', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diastolic BP</label>
              <input
                type="number"
                value={formData.diastolicBP}
                onChange={(e) => handleChange('diastolicBP', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-right">
            Estimated MAP: <span className="font-semibold text-gray-900">{calculateMAP()} mmHg</span>
          </div>
        </div>

        {/* Section 3: Respiratory & Labs (SOFA Inputs) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
            <TestTube className="w-5 h-5 text-indigo-500" />
            Labs, Renal & Respiratory
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">SpO2 (%)</label>
              <input
                type="number"
                min="0" max="100"
                value={formData.spo2}
                onChange={(e) => handleChange('spo2', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">PaO2 (mmHg)</label>
              <input
                type="number"
                value={formData.pao2}
                onChange={(e) => handleChange('pao2', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">FiO2 (%)</label>
              <input
                type="number"
                min="21" max="100"
                value={formData.fio2}
                onChange={(e) => handleChange('fio2', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Urine Output (ml/hr)</label>
              <input
                type="number"
                value={formData.urineOutput}
                onChange={(e) => handleChange('urineOutput', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Platelets (x10³/µL)</label>
              <input
                type="number"
                value={formData.platelets}
                onChange={(e) => handleChange('platelets', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bilirubin (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={formData.bilirubin}
                onChange={(e) => handleChange('bilirubin', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Creatinine (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={formData.creatinine}
                onChange={(e) => handleChange('creatinine', parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Neurological (GCS) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Glasgow Coma Scale (GCS)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Eye Opening</label>
              <select
                value={formData.gcsEye}
                onChange={(e) => handleChange('gcsEye', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value={4}>4 - Spontaneous</option>
                <option value={3}>3 - To Sound</option>
                <option value={2}>2 - To Pressure</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Verbal Response</label>
              <select
                value={formData.gcsVerbal}
                onChange={(e) => handleChange('gcsVerbal', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value={5}>5 - Oriented</option>
                <option value={4}>4 - Confused</option>
                <option value={3}>3 - Words</option>
                <option value={2}>2 - Sounds</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Motor Response</label>
              <select
                value={formData.gcsMotor}
                onChange={(e) => handleChange('gcsMotor', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value={6}>6 - Obey Commands</option>
                <option value={5}>5 - Localizing</option>
                <option value={4}>4 - Normal Flexion</option>
                <option value={3}>3 - Abnormal Flexion</option>
                <option value={2}>2 - Extension</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-right">
            Total GCS: <span className="font-semibold text-gray-900">{calculateGCS()}/15</span>
          </div>
        </div>

        {/* Section 5: Other */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
            <Activity className="w-5 h-5 text-gray-500" />
            Additional Context
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Comorbidities</label>
              <textarea
                rows={2}
                placeholder="e.g. Diabetes, Hypertension, COPD..."
                value={formData.comorbidities}
                onChange={(e) => handleChange('comorbidities', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Analyzing with AI Model...
              </>
            ) : (
              'Run Prediction Model'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};