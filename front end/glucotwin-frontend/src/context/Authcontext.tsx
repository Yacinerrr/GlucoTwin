// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, patientAPI, doctorAPI } from '../services/api';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'doctor' | 'patient';
  // Additional fields based on role
  specialty?: string;
  hospital?: string;
  phone?: string;
  age?: number;
  weight_kg?: number;
  diabetes_type?: string;
  insulin_ratio?: number;
  sensitivity?: number;
  target_glucose?: number;
  is_ramadan_mode?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData, role: 'doctor' | 'patient') => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface RegisterData {
  email: string;
  full_name: string;
  password: string;
  specialty?: string;
  hospital?: string;
  phone?: string;
  age?: number;
  weight_kg?: number;
  diabetes_type?: string;
  doctor_invite_code?: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user_data');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      // Save token
      localStorage.setItem('access_token', response.access_token);
      
      // Fetch full user profile based on role
      let userData;
      if (response.role === 'doctor') {
        userData = await doctorAPI.getProfile();
      } else {
        userData = await patientAPI.getProfile();
      }
      
      const user: User = {
        id: response.user_id,
        full_name: response.full_name,
        email: email,
        role: response.role,
        ...userData,
      };
      
      localStorage.setItem('user_data', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData, role: 'doctor' | 'patient') => {
    try {
      let response;
      if (role === 'doctor') {
        response = await authAPI.registerDoctor(data as any);
      } else {
        response = await authAPI.registerPatient(data as any);
      }
      
      // After registration, automatically log in
      await login(data.email, data.password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};