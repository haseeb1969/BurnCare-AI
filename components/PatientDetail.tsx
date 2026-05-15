import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { PatientRecord, VitalEntry, NotificationRecord } from '../types';
import { RiskChart } from './RiskChart';
import { BodyMap } from './BodyMap';
import { VitalCharts } from './VitalCharts';
import { jsPDF } from 'jspdf';
import { ArrowLeft, User, Activity, Flame, CheckCircle, Clock, Plus, AlertOctagon, ShieldCheck, Save, Loader2, Download, FileText, X } from 'lucide-react';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientRecord | undefined>(undefined);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<NotificationRecord | null>(null);

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

  // Fetch pending notifications for this doctor and patient
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!patient) return;
      try {
        const notifs = await apiService.getMyNotifications();
        const p = notifs.find(n => n.patient_id === patient.id && n.status === 'pending');
        setPendingNotification(p || null);
      } catch (e) {
        console.error('Failed to fetch notifications for patient detail', e);
      }
    };
    fetchNotifications();
  }, [patient]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (updateMessage) {
      const timer = setTimeout(() => setUpdateMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateMessage]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  };

  const hasLiveRisk = typeof patient?.currentMortalityRisk === 'number' && !!patient?.currentRiskLevel;
  const baselineLocation = patient?.baseline_location || patient?.location || 'Ward';
  const baselineDoctorName = patient?.baseline_assigned_doctor_name || patient?.assigned_doctor_name || 'Unassigned';
  const baselineDoctorLocation = patient?.baseline_assigned_doctor_location || patient?.assigned_doctor_location || baselineLocation;

  const getLiveAllocationRecommendation = () => {
    // If there is a pending relocation notification, prefer its proposed location
    if (pendingNotification) return pendingNotification.proposed_location;
    // Fallback to patient's recorded location
    return patient?.location || 'Ward';
  };

  const getClinicalRecommendations = () => {
    if (!patient) {
      return [] as string[];
    }

    if (hasLiveRisk) {
      const liveRisk = patient.currentMortalityRisk ?? patient.mortalityRiskPercent;
      const liveRiskLabel = patient.currentRiskLevel || patient.riskLevel || 'N/A';
      const liveAllocation = getLiveAllocationRecommendation();

      return [
        `Live risk updated to ${liveRiskLabel}${typeof liveRisk === 'number' ? ` (${liveRisk.toFixed(1)}%)` : ''}.`,
        `Recommended allocation: ${liveAllocation}.`,
        liveAllocation === 'ICU'
          ? 'Maintain ICU-level monitoring and reassess after each vital update.'
          : 'Continue ward care with close observation and escalate if the live risk worsens.',
      ];
    }

    return patient.recommendations?.length
      ? patient.recommendations
      : ['Awaiting live monitoring data to recalculate risk and recommendations.'];
  };

  const generatePatientPdf = () => {
    if (!patient) return null;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const columnGap = 18;
    const cardWidth = (contentWidth - columnGap) / 2;
    const sectionGap = 18;
    const lineHeight = 14;

    const ensureSpace = (neededHeight: number, currentY: number) => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        return margin;
      }
      return currentY;
    };

    const drawPageHeader = (y: number) => {
      doc.setFillColor(30, 64, 175);
      doc.roundedRect(margin, y, contentWidth, 72, 14, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('BurnCare AI', margin + 18, y + 28);
      doc.setFontSize(16);
      doc.text('Patient Details Report', margin + 18, y + 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 18, y + 28, { align: 'right' });
      doc.text(`Patient ID: ${patient.id}`, pageWidth - margin - 18, y + 48, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      return y + 94;
    };

    const drawSectionTitle = (title: string, y: number, accent = [37, 99, 235]) => {
      y = ensureSpace(28, y);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(margin, y, 4, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, margin + 12, y + 13);
      return y + 24;
    };

    const drawCard = (x: number, y: number, width: number, title: string, lines: string[], accent: [number, number, number]) => {
      const estimatedHeight = 46 + lines.length * lineHeight;
      y = ensureSpace(estimatedHeight, y);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, width, estimatedHeight, 10, 10, 'FD');
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(x, y, width, 8, 10, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(title, x + 12, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      lines.forEach((line, index) => {
        const wrapped = doc.splitTextToSize(line, width - 24);
        doc.text(wrapped, x + 12, y + 38 + (index * lineHeight));
      });
      return y + estimatedHeight + 10;
    };

    const drawKeyValueGrid = (items: Array<{ label: string; value: string }>, y: number) => {
      const rows = [] as Array<Array<{ label: string; value: string }>>;
      for (let index = 0; index < items.length; index += 2) {
        rows.push(items.slice(index, index + 2));
      }

      rows.forEach((row) => {
        const left = row[0];
        const right = row[1];
        const rowHeight = 48;
        y = ensureSpace(rowHeight + 10, y);

        if (left) {
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, y, cardWidth, rowHeight, 10, 10, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(left.label.toUpperCase(), margin + 12, y + 16);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(left.value, margin + 12, y + 33);
        }

        if (right) {
          const rightX = margin + cardWidth + columnGap;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(rightX, y, cardWidth, rowHeight, 10, 10, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(right.label.toUpperCase(), rightX + 12, y + 16);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(right.value, rightX + 12, y + 33);
        }

        y += rowHeight + 10;
      });

      return y;
    };

    const drawVitalsTable = (entries: VitalEntry[], y: number) => {
      const visibleEntries = entries.slice(-5).reverse();
      const rowHeight = 26;
      const tableWidth = contentWidth;
      const columns = [
        { title: 'Time', width: 98 },
        { title: 'Temp', width: 54 },
        { title: 'HR', width: 44 },
        { title: 'BP', width: 82 },
        { title: 'SpO2', width: 54 },
        { title: 'Urine', width: 58 },
        { title: 'GCS', width: 70 },
      ];

      const totalNeeded = 34 + (visibleEntries.length + 1) * rowHeight;
      y = ensureSpace(totalNeeded, y);

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, y, tableWidth, 22, 8, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);

      let x = margin + 10;
      columns.forEach((column) => {
        doc.text(column.title, x, y + 15);
        x += column.width;
      });

      y += 22;
      visibleEntries.forEach((entry, index) => {
        const fill = index % 2 === 0 ? [248, 250, 252] as const : [255, 255, 255] as const;
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, tableWidth, rowHeight, 0, 0, 'FD');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);

        let cellX = margin + 10;
        const values = [
          formatDateTime(entry.timestamp),
          `${entry.temperature} C`,
          `${entry.heartRate}`,
          `${entry.systolicBP}/${entry.diastolicBP}`,
          `${entry.spo2}`,
          `${entry.urineOutput}`,
          `E${entry.gcsEye} V${entry.gcsVerbal} M${entry.gcsMotor}`,
        ];

        values.forEach((value, valueIndex) => {
          const columnWidth = columns[valueIndex].width;
          const truncated = doc.splitTextToSize(value, columnWidth - 8);
          doc.text(truncated, cellX, y + 17);
          cellX += columnWidth;
        });

        y += rowHeight;
      });

      if (visibleEntries.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, tableWidth, rowHeight, 0, 0, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('No clinical monitoring entries available.', margin + 12, y + 17);
        y += rowHeight;
      }

      return y + 8;
    };

    const drawParagraph = (text: string, y: number) => {
      const wrapped = doc.splitTextToSize(text, contentWidth);
      y = ensureSpace(wrapped.length * 14 + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      doc.text(wrapped, margin, y + 12);
      return y + wrapped.length * 14 + 8;
    };

    let y = margin;

    y = drawPageHeader(y);

    y = drawSectionTitle('Patient Snapshot', y, [37, 99, 235]);
    y = drawKeyValueGrid([
      { label: 'Name', value: patient.name || 'Unknown Patient' },
      { label: 'Age', value: `${patient.age ?? 'N/A'}` },
      { label: 'Gender', value: patient.gender || 'N/A' },
      { label: 'Status', value: patient.status || 'Active' },
      { label: 'Hospital', value: patient.hospital_name || patient.hospital_id || 'N/A' },
      { label: 'Assigned Doctor', value: baselineDoctorName !== 'Unassigned' ? `${baselineDoctorName} (${baselineDoctorLocation})` : 'Unassigned' },
      { label: 'Admitted', value: formatDateTime(patient.timestamp) },
    ], y);

    y = drawSectionTitle('Burn Profile', y, [249, 115, 22]);
    y = drawKeyValueGrid([
      { label: 'TBSA', value: `${patient.tbsa ?? 'N/A'}%` },
      { label: 'Burn Depth', value: patient.burnDepth || 'N/A' },
      { label: 'Inhalation Injury', value: patient.inhalationInjury ? 'Yes' : 'No' },
      { label: 'Regions', value: (patient.burnedRegions && patient.burnedRegions.length > 0) ? patient.burnedRegions.join(', ') : 'Not specified' },
    ], y);

    y = drawSectionTitle('Lab Results', y, [139, 92, 246]);
    y = drawKeyValueGrid([
      { label: 'Platelets', value: `${patient.platelets ?? 'N/A'}` },
      { label: 'Bilirubin', value: `${patient.bilirubin ?? 'N/A'}` },
      { label: 'Creatinine', value: `${patient.creatinine ?? 'N/A'}` },
    ], y);

    y = drawSectionTitle('Respiratory Assessment', y, [6, 182, 212]);
    y = drawKeyValueGrid([
      { label: 'SpO2', value: `${patient.spo2 ?? 'N/A'}%` },
      { label: 'PaO2', value: `${patient.pao2 ?? 'N/A'}` },
      { label: 'FiO2', value: `${patient.fio2 ?? 'N/A'}%` },
    ], y);

    y = drawSectionTitle('Glasgow Coma Scale', y, [185, 28, 28]);
    y = drawKeyValueGrid([
      { label: 'Eye Opening', value: `${patient.gcsEye ?? 'N/A'}` },
      { label: 'Verbal Response', value: `${patient.gcsVerbal ?? 'N/A'}` },
      { label: 'Motor Response', value: `${patient.gcsMotor ?? 'N/A'}` },
    ], y);

    if (patient.bodyMapImage && patient.bodyMapImage.startsWith('data:image/')) {
      y = ensureSpace(230, y);
      y = drawSectionTitle('Burn Map Snapshot', y, [14, 165, 233]);
      const imageHeight = 180;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, imageHeight + 18, 10, 10, 'FD');
      try {
        const imageFormat = patient.bodyMapImage.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(patient.bodyMapImage, imageFormat, margin + 12, y + 10, contentWidth - 24, imageHeight);
      } catch {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('Unable to embed burn map image.', margin + 12, y + 30);
      }
      y += imageHeight + 30;
    }

    y = drawSectionTitle('Clinical Monitoring', y, [34, 197, 94]);
    y = drawVitalsTable(patient.hourlyVitals || [], y);
    y += sectionGap;

    y = drawSectionTitle('AI Analysis', y, [99, 102, 241]);
    const liveAllocation = getLiveAllocationRecommendation();
    const liveRecommendations = getClinicalRecommendations();
    y = drawCard(margin, y, contentWidth, 'Risk Summary', [
      `Baseline Mortality Risk: ${patient.mortalityRiskPercent ?? 'N/A'}%`,
      `Risk Level: ${patient.riskLevel || 'N/A'}`,
      typeof patient.currentMortalityRisk === 'number'
        ? `Current Mortality Risk: ${patient.currentMortalityRisk.toFixed(1)}%`
        : 'Current Mortality Risk: Pending monitoring data',
      patient.currentRiskLevel
        ? `Current Risk Level: ${patient.currentRiskLevel}`
        : 'Current Risk Level: Pending monitoring data',
      `Baseline Recommended Allocation: ${baselineLocation}`,
      `Baseline Assigned Doctor: ${baselineDoctorName !== 'Unassigned' ? `${baselineDoctorName} (${baselineDoctorLocation})` : 'Unassigned'}`,
      `Live Recommended Allocation: ${liveAllocation}`,
      `Current Assigned Doctor: ${patient.assigned_doctor_name ? `${patient.assigned_doctor_name} (${patient.assigned_doctor_location || patient.location || 'Ward'})` : 'Unassigned'}`,
    ], [99, 102, 241]);

    y = drawParagraph(patient.reasoning || 'No reasoning available.', y);

    if (liveRecommendations.length > 0) {
      y = drawCard(margin, y, contentWidth, 'Live Recommendations', liveRecommendations, [14, 165, 233]);
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('BurnCare AI - Confidential clinical report', margin, pageHeight - 18);
    doc.text(`Patient ${patient.id}`, pageWidth - margin, pageHeight - 18, { align: 'right' });

    return doc.output('blob');
  };

  const openPdfPreview = () => {
    if (!patient) return;

    setIsGeneratingPdf(true);
    try {
      const blob = generatePatientPdf();
      if (!blob) return;

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl(nextUrl);
      setShowPdfPreview(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl || !patient) return;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `patient-${patient.id || 'record'}.pdf`;
    link.click();
  };

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
      setUpdateMessage({ text: 'Saving vitals and recalculating mortality risk...', type: 'info' });
      await apiService.updatePatient(id, { hourlyVitals: updatedHistory });
      
      // Wait for LSTM background task to complete (max 5 seconds with polling)
      // The background task calculates new mortality risk based on updated vitals
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 500; // 500ms between polls
      
      const pollForUpdate = async () => {
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          
          try {
            const freshPatient = await apiService.getPatient(id);
            // Check if new risk has been calculated (currentRiskLevel should be set)
            if (freshPatient.currentRiskLevel) {
              setUpdateMessage({ 
                text: `Vitals saved! Mortality risk updated: ${freshPatient.currentRiskLevel} (${freshPatient.currentMortalityRisk?.toFixed(1)}%)`, 
                type: 'success' 
              });
              setRefreshTrigger(prev => prev + 1);
              setShowVitalsForm(false);
              return;
            }
          } catch (e) {
            console.error('Error polling for risk update:', e);
          }
        }
        
        // If we timeout, still refresh with whatever we have
        setUpdateMessage({ 
          text: 'Vitals saved. Mortality risk calculation in progress...', 
          type: 'info' 
        });
        setRefreshTrigger(prev => prev + 1);
        setShowVitalsForm(false);
      };
      
      pollForUpdate();
    } catch (e) {
      console.error('Failed to save vital entry', e);
      setUpdateMessage({ text: 'Failed to save vitals', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {showPdfPreview && pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPdfPreview(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  PDF Preview
                </h3>
                <p className="text-sm text-gray-500">Review the generated patient details before downloading.</p>
              </div>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-gray-100">
              <iframe
                title="Patient PDF Preview"
                src={pdfUrl}
                className="w-full h-full border-0"
              />
            </div>

            <div className="border-t border-gray-200 bg-white px-5 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button
                onClick={() => setShowPdfPreview(false)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={downloadPdf}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button
              onClick={openPdfPreview}
              disabled={isGeneratingPdf}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}
              Download patient Details
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

                <div className="border border-gray-200 rounded-lg overflow-hidden flex justify-center bg-white shadow-inner min-h-[200px] items-center">
                  {patient.bodyMapImage && patient.bodyMapImage.length > 100 ? (
                    <img 
                      src={patient.bodyMapImage} 
                      alt="Patient Burn Map" 
                      className="w-full h-auto object-contain max-h-[400px]" 
                    />
                  ) : (
                    <div className="scale-75 origin-top -mb-20">
                      <BodyMap selectedRegions={patient.burnedRegions || []} readOnly={true} />
                    </div>
                  )}
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
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
                    <p className="text-sm text-blue-900 font-medium">
                      ⚡ Automatic Risk Recalculation
                    </p>
                    <p className="text-xs text-blue-800 mt-1">
                      When vitals are submitted, the AI model will recalculate mortality risk and resource allocation recommendation. Check "Current Status (LSTM)" above for updated predictions.
                    </p>
                  </div>
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
                      {hasLiveRisk && (
                        <div className="mt-3 space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold 
                              ${getLiveAllocationRecommendation() === 'ICU' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            Live Recommendation: {getLiveAllocationRecommendation()}
                          </span>
                          <p className="text-[11px] text-gray-500">
                            Updated from the latest monitored vitals.
                          </p>
                        </div>
                      )}
                      <div className="mt-2 space-y-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold 
                            ${baselineLocation === 'ICU' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          Baseline Recommended: {baselineLocation}
                        </span>
                        {pendingNotification && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                            Pending Relocation: {pendingNotification.proposed_location}
                          </span>
                        )}
                        <div>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                            Doctor: {baselineDoctorName}
                          </span>
                        </div>
                      </div>
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
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold 
                              ${getLiveAllocationRecommendation() === 'ICU' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            Recommended: {getLiveAllocationRecommendation()}
                          </span>
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                            Doctor: {patient.assigned_doctor_name || 'Unassigned'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-blue-300">
                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">{patient.currentRiskLevel || "Awaiting live risk calculation"}</span>
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
                  {hasLiveRisk && (
                    <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                      Live allocation recommendation: <span className="font-semibold">{getLiveAllocationRecommendation()}</span>
                    </div>
                  )}

                  {pendingNotification && (
                    <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                      Pending relocation to <strong>{pendingNotification.proposed_location}</strong>. Approve or reject on the <a href="#/notifications" className="text-blue-600 underline">Notifications</a> page.
                    </div>
                  )}
                  <ul className="space-y-2">
                    {getClinicalRecommendations().map((rec, idx) => (
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