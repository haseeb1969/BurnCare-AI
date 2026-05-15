import axios from 'axios';
import { PatientInput, PatientRecord, ManualOverride, NotificationRecord, Hospital, HospitalICUSummary } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Interceptor to attach JWT token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const apiService = {
    async getPatients(): Promise<PatientRecord[]> {
        try {
            const response = await apiClient.get<PatientRecord[]>('/patients/');
            return response.data;
        } catch (error) {
            console.error('Error fetching patients:', error);
            throw error;
        }
    },

    async getPatient(id: string): Promise<PatientRecord> {
        try {
            const response = await apiClient.get<PatientRecord>(`/patients/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching patient ${id}:`, error);
            throw error;
        }
    },

    async createPatient(data: PatientInput): Promise<PatientRecord> {
        try {
            const response = await apiClient.post<PatientRecord>('/patients/', data);
            return response.data;
        } catch (error) {
            console.error('Error creating patient:', error);
            throw error;
        }
    },

    async updatePatient(id: string, updates: Partial<PatientRecord>): Promise<PatientRecord> {
        try {
            const response = await apiClient.put<PatientRecord>(`/patients/${id}`, updates);
            return response.data;
        } catch (error) {
            console.error(`Error updating patient ${id}:`, error);
            throw error;
        }
    },

    async deletePatient(id: string): Promise<PatientRecord> {
        try {
            const response = await apiClient.delete<PatientRecord>(`/patients/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting patient ${id}:`, error);
            throw error;
        }
    },

    async updateTriage(id: string, override: ManualOverride): Promise<PatientRecord> {
        try {
            const response = await apiClient.put<PatientRecord>(`/patients/${id}/triage`, { triage_override: override });
            return response.data;
        } catch (error) {
            console.error(`Error updating triage for patient ${id}:`, error);
            throw error;
        }
    },

    async getMyPatients(): Promise<PatientRecord[]> {
        try {
            const response = await apiClient.get<PatientRecord[]>('/patients/my-assigned');
            return response.data;
        } catch (error) {
            console.error('Error fetching assigned patients:', error);
            throw error;
        }
    }
    ,

    async getMyHospital(): Promise<Hospital> {
        try {
            const response = await apiClient.get<Hospital>('/hospitals/me');
            return response.data;
        } catch (error) {
            console.error('Error fetching hospital details:', error);
            throw error;
        }
    },

    async getMyHospitalIcuSummary(): Promise<HospitalICUSummary> {
        try {
            const response = await apiClient.get<HospitalICUSummary>('/hospitals/me/icu-summary');
            return response.data;
        } catch (error) {
            console.error('Error fetching ICU summary:', error);
            throw error;
        }
    },

    async getMyNotifications(): Promise<NotificationRecord[]> {
        try {
            const response = await apiClient.get<NotificationRecord[]>('/notifications/my');
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    async respondNotification(notificationId: string, action: 'approve' | 'reject') {
        try {
            const response = await apiClient.put(`/notifications/${notificationId}/respond`, { action });
            return response.data;
        } catch (error) {
            console.error('Error responding to notification:', error);
            throw error;
        }
    }
};
