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

export interface PatientInput {
  name: string;
  age: number;
  gender: Gender;
  tbsa: number;
  burnDepth: BurnDepth;
  inhalationInjury: boolean;
  comorbidities: string;

  burnedRegions: string[];

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