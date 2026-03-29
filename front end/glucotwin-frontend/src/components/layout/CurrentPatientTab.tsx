import { ChevronDown, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/Authcontext";
import { useCurrentPatient } from "../../context/CurrentPatientContext";

export function CurrentPatientTab() {
  const { user } = useAuth();
  const { currentPatient, patients, setCurrentPatient, isLoadingPatients } =
    useCurrentPatient();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for doctors
  if (user?.role !== "doctor") {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
      >
        <User size={16} className="text-blue-600" />
        <span className="hidden text-xs sm:inline">Current Patient:</span>
        <span className="font-bold text-blue-700">
          {currentPatient?.full_name || "Select Patient"}
        </span>
        <ChevronDown
          size={16}
          className={`transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          {isLoadingPatients ? (
            <div className="flex items-center justify-center px-4 py-3">
              <div className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
              <p className="ml-2 text-xs text-slate-600">Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="px-4 py-3 text-center text-xs text-slate-500">
              No patients linked yet
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    setCurrentPatient(patient);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${
                    currentPatient?.id === patient.id
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{patient.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {patient.diabetes_type || "Diabetes"} • Age{" "}
                        {patient.age || "N/A"}
                      </p>
                    </div>
                    {currentPatient?.id === patient.id && (
                      <span className="text-xs font-bold text-blue-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
