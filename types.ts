export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum BurnDepth {
  Superficial = 'Superficial',
  PartialThickness = 'Partial Thickness',
  FullThickness = 'Full Thickness'
}

export interface VitalEntry {
  timestamp: string;
  temperature: number; // Celsius
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  spo2: number;
  urineOutput: number; // ml/hr
  gcsEye: number;
  gcsVerbal: number;
  gcsMotor: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'DOCTOR' | 'STAFF';
  assigned_location: 'Ward' | 'ICU' | 'N/A';
  license_number?: string;
  specialization?: string;
  phone_number?: string;
  hospital_id: string;
  is_approved: boolean;
  created_at: string;
}

export interface PatientInput {
  name: string;
  age: number;
  gender: Gender;
  location: 'Ward' | 'ICU';
  tbsa: number;
  burnDepth: BurnDepth;
  inhalationInjury: boolean;
  comorbidities: string;

  burnedRegions: string[];
  bodyMapImage?: string; // Base64 image data of the burn map

  // Hemodynamics
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  temperature: number; // New Field

  // Respiratory
  spo2: number;
  pao2: number;
  fio2: number;

  // Renal
  urineOutput: number; // New Field (Initial)

  // Labs
  platelets: number;
  bilirubin: number;
  creatinine: number;

  // Neurological (GCS)
  gcsEye: number;
  gcsVerbal: number;
  gcsMotor: number;

  triage_override?: ManualOverride;
  benefit_score?: number;
}

export interface PredictionResult {
  mortalityRiskPercent: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  sofaScore?: number;
  reasoning: string;
  recommendations: string[];
}

export interface PatientRecord extends PatientInput, PredictionResult {
  id: string;
  timestamp: string;
  status: 'Active' | 'Deceased' | 'Discharged' | 'Recovered'; // Updated Terminology
  hospital_id: string;
  hospital_name?: string;
  assigned_doctor_id?: string;
  assigned_doctor_name?: string;
  assigned_doctor_location?: 'Ward' | 'ICU' | 'N/A';
  hourlyVitals: VitalEntry[]; // New Field

  // Real-time Monitoring
  currentMortalityRisk?: number;
  currentRiskLevel?: string;
  currentSofaScore?: number;
}

export type AllocationStatus = 'ICU' | 'Ward' | 'Discharged';
export type ManualOverride = 'ForceICU' | 'ForceWard' | null;

export interface TriageEntry {
  patientId: string;
  patientName: string;
  mortalityRisk: number;
  survivalProb: number;
  benefitScore: number;
  allocation: AllocationStatus;
  override: ManualOverride;
  status: string; // From PatientRecord
  riskSource: 'Baseline' | 'Live';
}

export interface TriageState {
  totalBeds: number;
  allocations: TriageEntry[];
  expectedSurvivors: number;
}