// services/api.ts
import axios from "axios";

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
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
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);

// Auth endpoints
export const authAPI = {
  login: async (email: string, password: string) => {
    // Using OAuth2PasswordRequestForm format
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  registerDoctor: async (data: DoctorRegisterData) => {
    const response = await api.post("/auth/doctor/register", data);
    return response.data;
  },

  registerPatient: async (data: PatientRegisterData) => {
    const response = await api.post("/auth/patient/register", data);
    return response.data;
  },
};

// Doctor endpoints
export const doctorAPI = {
  getProfile: async () => {
    const response = await api.get("/auth/doctor/me");
    return response.data;
  },

  getPatients: async () => {
    const response = await api.get("/auth/doctor/patients");
    return response.data;
  },

  getInviteCode: async () => {
    const response = await api.get("/auth/doctor/invite-code");
    return response.data;
  },

  regenerateInviteCode: async () => {
    const response = await api.post("/auth/doctor/regenerate-code");
    return response.data;
  },
};

// Patient endpoints
export const patientAPI = {
  getProfile: async () => {
    const response = await api.get("/auth/patient/me");
    return response.data;
  },

  updateProfile: async (data: PatientUpdateData) => {
    const response = await api.put("/auth/patient/me", data);
    return response.data;
  },

  linkToDoctor: async (inviteCode: string) => {
    const response = await api.post("/auth/patient/link-doctor", null, {
      params: { invite_code: inviteCode },
    });
    return response.data;
  },

  getMyDoctor: async () => {
    const response = await api.get("/auth/patient/my-doctor");
    return response.data;
  },
};

export interface SacDosePredictionResponse {
  recommended_dose: number;
  raw_dose: number;
  blocked: boolean;
  current_glucose: number;
  carbs_intake: number;
}

export const glucoseAPI = {
  predictSacDose: async (
    currentGlucose: number,
    carbsIntake = 0,
    glucoseHistory?: number[],
  ) => {
    const response = await api.post<SacDosePredictionResponse>(
      "/glucose/predict/sac-dose",
      null,
      {
        params: {
          current_glucose: currentGlucose,
          carbs_intake: carbsIntake,
          glucose_history: glucoseHistory,
        },
        paramsSerializer: {
          indexes: null,
        },
      },
    );

    return response.data;
  },
};

export interface InsulinDose {
  id: number;
  patient_id: number;
  dose_amount: number;
  dose_type: string;
  current_glucose?: number;
  carbs_intake?: number;
  notes?: string;
  is_recommended: boolean;
  recorded_at: string;
  created_at: string;
}

export interface InsulinStats {
  total_doses: number;
  total_units: number;
  average_dose: number;
  dose_count_by_type: Record<string, number>;
  recommended_doses_count: number;
}

export interface InsulinDailySummary {
  date: string;
  total_dose: number;
  count: number;
  dose_types: Record<string, number>;
}

export const insulinAPI = {
  logDose: async (data: {
    dose_amount: number;
    dose_type: "bolus" | "correction" | "basal";
    current_glucose?: number;
    carbs_intake?: number;
    notes?: string;
    is_recommended?: boolean;
    recorded_at: string;
  }) => {
    const response = await api.post<InsulinDose>("/insulin/log", data);
    return response.data;
  },

  getHistory: async (days: number = 7) => {
    const response = await api.get<InsulinDose[]>("/insulin/history/me", {
      params: { days },
    });
    return response.data;
  },

  getDailySummary: async (days: number = 7) => {
    const response = await api.get<InsulinDailySummary[]>(
      "/insulin/daily-summary/me",
      {
        params: { days },
      },
    );
    return response.data;
  },

  getStats: async (days: number = 7) => {
    const response = await api.get<InsulinStats>("/insulin/stats/me", {
      params: { days },
    });
    return response.data;
  },

  getPatientHistory: async (patientId: number, days: number = 7) => {
    const response = await api.get<InsulinDose[]>(
      `/insulin/history/${patientId}`,
      {
        params: { days },
      },
    );
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
