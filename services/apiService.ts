import axios from 'axios';
import { PatientInput, PatientRecord } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
    }
};
