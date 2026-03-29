import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./Authcontext";
import { doctorAPI } from "../services/api";

export interface PatientInfo {
  id: number;
  full_name: string;
  email: string;
  age?: number;
  diabetes_type?: string;
  weight_kg?: number;
  target_glucose?: number;
  insulin_ratio?: number;
  sensitivity?: number;
}

interface CurrentPatientContextType {
  currentPatient: PatientInfo | null;
  patients: PatientInfo[];
  isLoadingPatients: boolean;
  setCurrentPatient: (patient: PatientInfo | null) => void;
  refreshPatients: () => Promise<void>;
}

const CurrentPatientContext = createContext<
  CurrentPatientContextType | undefined
>(undefined);

export const useCurrentPatient = () => {
  const context = useContext(CurrentPatientContext);
  if (!context) {
    throw new Error(
      "useCurrentPatient must be used within CurrentPatientProvider",
    );
  }
  return context;
};

export const CurrentPatientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const [currentPatient, setCurrentPatient] = useState<PatientInfo | null>(
    null,
  );
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const refreshPatients = useCallback(async () => {
    if (user?.role !== "doctor") return;

    setIsLoadingPatients(true);
    try {
      const doctorPatients = await doctorAPI.getPatients();
      setPatients(doctorPatients || []);

      // Auto-select first patient if none selected
      if (doctorPatients && doctorPatients.length > 0 && !currentPatient) {
        setCurrentPatient(doctorPatients[0]);
      }
    } catch (error) {
      console.error("Failed to load patients:", error);
      setPatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [currentPatient, user?.role]);

  useEffect(() => {
    if (user?.role === "doctor") {
      refreshPatients();
    } else {
      // Reset for non-doctors
      setCurrentPatient(null);
      setPatients([]);
    }
  }, [user?.id, user?.role, refreshPatients]);

  return (
    <CurrentPatientContext.Provider
      value={{
        currentPatient,
        patients,
        isLoadingPatients,
        setCurrentPatient,
        refreshPatients,
      }}>
      {children}
    </CurrentPatientContext.Provider>
  );
};
