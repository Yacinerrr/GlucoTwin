import { useEffect, useMemo, useState } from "react";
import {
  MetabolicChart,
  type MetabolicPoint,
} from "../../components/charts/MetabolicChart";
import { RiskAnalysisChart } from "../../components/charts/RiskAnalysisChart";
import { ActionHub } from "../../components/dashboard/ActionHub";
import { KpiSummaryCards } from "../../components/dashboard/KpiSummaryCards";
import { PatientInsights } from "../../components/dashboard/PatientInsights";
import { useAuth } from "../../context/Authcontext";
import { useCurrentPatient } from "../../context/CurrentPatientContext";
import { doctorAPI, patientAPI } from "../../services/api";

interface PatientDashboard {
  id: string;
  name: string;
  age: number;
  condition: string;
  currentGlucose: number;
  glucoseTrendText: string;
  riskWindowText: string;
  riskPercent: number;
  warningInsight: string;
  successInsight: string;
  metabolicData: MetabolicPoint[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const { currentPatient, setCurrentPatient, patients } = useCurrentPatient();
  const [loadedPatients, setLoadedPatients] = useState<PatientDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patients based on user role
  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) return;

        if (user.role === "doctor") {
          // Doctor: fetch their patients
          const backendPatients = await doctorAPI.getPatients();
          const formattedPatients: PatientDashboard[] = backendPatients.map(
            (p: { id: number; full_name: string; age: number; diabetes_type: string }) => ({
              id: String(p.id),
              name: p.full_name,
              age: p.age || 0,
              condition: p.diabetes_type || "Diabetes",
              currentGlucose: 120,
              glucoseTrendText: "Data loading...",
              riskWindowText: "Data loading...",
              riskPercent: 0,
              warningInsight: "Glucose data will appear once available.",
              successInsight: "Patient linked successfully.",
              metabolicData: [{ time: "11:00", baseline: 120, projected: 120 }],
            }),
          );
          setLoadedPatients(formattedPatients);
        } else if (user.role === "patient") {
          // Patient: show their own data
          await patientAPI.getProfile();
          const selfPatient: PatientDashboard = {
            id: String(user.id),
            name: user.full_name,
            age: user.age || 0,
            condition: user.diabetes_type || "Diabetes",
            currentGlucose: 120,
            glucoseTrendText: "Stable",
            riskWindowText: "2h 15m",
            riskPercent: 65,
            warningInsight: "Your health data will appear here.",
            successInsight: "Patient profile loaded successfully.",
            metabolicData: [
              { time: "11:00", baseline: 120, projected: 118 },
              { time: "12:00", baseline: 130, projected: 124 },
              { time: "13:00", baseline: 144, projected: 133 },
              { time: "14:00", baseline: 128, projected: 137 },
              { time: "15:00", baseline: 116, projected: 129 },
              { time: "16:00", baseline: 110, projected: 119 },
              { time: "17:00", baseline: 104, projected: 112 },
            ],
          };
          setLoadedPatients([selfPatient]);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Failed to load patient data";
        console.error("Failed to load patients:", error);
        setError("Failed to load patient data");
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [user]);

  const selectedPatient = useMemo(
    () =>
      loadedPatients.find((patient) => patient.id === String(currentPatient?.id)) ??
      null,
    [currentPatient?.id, loadedPatients],
  );

  return (
    <section className="grid gap-3.5">
      <header className="px-0.5 py-1">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
          Digital Twin Insights
        </p>
        <h1 className="mt-1 font-['Sora'] text-[1.75rem] font-bold tracking-tight text-slate-800">
          {user?.role === "doctor"
            ? "My Patients Monitor"
            : "Patient Monitoring Dashboard"}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            {user?.role === "doctor" ? "My Patients" : "Profile"}
          </h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            {user?.role === "doctor"
              ? "Your linked patients"
              : "Your health profile"}
          </p>

          {isLoading && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">Loading patients...</p>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            {loadedPatients.map((patient) => {
              const isActive = currentPatient?.id === parseInt(patient.id);

              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    const patientInfo = patients.find(p => p.id === parseInt(patient.id));
                    if (patientInfo) {
                      setCurrentPatient(patientInfo);
                    }
                  }}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    isActive
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100",
                  ].join(" ")}>
                  <p className="m-0 text-sm font-bold text-slate-800">
                    {patient.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {patient.condition} · {patient.age}y
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-3.5">
          {!selectedPatient ? (
            <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <div>
                <h3 className="m-0 font-['Sora'] text-lg font-bold text-slate-700">
                  No patient selected
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Choose one patient from the list to render charts and risk
                  analysis.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Active patient
                </p>
                <h2 className="mt-1 font-['Sora'] text-xl font-bold text-slate-800">
                  {selectedPatient.name}
                </h2>
                <p className="m-0 text-sm text-slate-500">
                  {selectedPatient.condition}
                </p>
              </div>

              <MetabolicChart data={selectedPatient.metabolicData} />

              <section className="grid grid-cols-2 gap-3">
                <KpiSummaryCards
                  glucoseValue={selectedPatient.currentGlucose}
                  glucoseTrendText={selectedPatient.glucoseTrendText}
                  riskWindowText={selectedPatient.riskWindowText}
                />
                <RiskAnalysisChart risk={selectedPatient.riskPercent} />
              </section>

              <ActionHub />

              <PatientInsights
                warningInsight={selectedPatient.warningInsight}
                successInsight={selectedPatient.successInsight}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
