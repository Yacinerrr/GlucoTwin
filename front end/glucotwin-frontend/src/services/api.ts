// services/api.ts
import axios from 'axios';

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: async (email: string, password: string) => {
    // Using OAuth2PasswordRequestForm format
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  registerDoctor: async (data: DoctorRegisterData) => {
    const response = await api.post('/auth/doctor/register', data);
    return response.data;
  },

  registerPatient: async (data: PatientRegisterData) => {
    const response = await api.post('/auth/patient/register', data);
    return response.data;
  },
};

// Doctor endpoints
export const doctorAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/doctor/me');
    return response.data;
  },

  getPatients: async () => {
    const response = await api.get('/auth/doctor/patients');
    return response.data;
  },

  getInviteCode: async () => {
    const response = await api.get('/auth/doctor/invite-code');
    return response.data;
  },

  regenerateInviteCode: async () => {
    const response = await api.post('/auth/doctor/regenerate-code');
    return response.data;
  },
};

// Patient endpoints
export const patientAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/patient/me');
    return response.data;
  },

  updateProfile: async (data: PatientUpdateData) => {
    const response = await api.put('/auth/patient/me', data);
    return response.data;
  },

  linkToDoctor: async (inviteCode: string) => {
    const response = await api.post('/auth/patient/link-doctor', null, {
      params: { invite_code: inviteCode },
    });
    return response.data;
  },

  getMyDoctor: async () => {
    const response = await api.get('/auth/patient/my-doctor');
    return response.data;
  },
};

// Types
export interface DoctorRegisterData {
  email: string;
  full_name: string;
  password: string;
  specialty?: string;
  hospital?: string;
  phone?: string;
}

export interface PatientRegisterData {
  email: string;
  full_name: string;
  password: string;
  age?: number;
  weight_kg?: number;
  diabetes_type?: string;
  doctor_invite_code?: string;
}

export interface PatientUpdateData {
  full_name?: string;
  age?: number;
  weight_kg?: number;
  diabetes_type?: string;
  insulin_ratio?: number;
  sensitivity?: number;
  target_glucose?: number;
  is_ramadan_mode?: boolean;
}