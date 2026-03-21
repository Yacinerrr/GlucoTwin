import { useMemo, useState } from "react";
import {
  MetabolicChart,
  type MetabolicPoint,
} from "../../components/charts/MetabolicChart";
import { RiskAnalysisChart } from "../../components/charts/RiskAnalysisChart";
import { ActionHub } from "../../components/dashboard/ActionHub";
import { KpiSummaryCards } from "../../components/dashboard/KpiSummaryCards";
import { PatientInsights } from "../../components/dashboard/PatientInsights";

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

const patients: PatientDashboard[] = [
  {
    id: "p-001",
    name: "John Doe",
    age: 34,
    condition: "Type 1 Diabetes",
    currentGlucose: 112,
    glucoseTrendText: "Stable in 6m",
    riskWindowText: "2h 15m",
    riskPercent: 65,
    warningInsight:
      "Your peak risk appears at 13:20. Reduce carbs by 10g at lunch to flatten spikes.",
    successInsight:
      "Safe-range time increased by 8% this week compared to your monthly baseline.",
    metabolicData: [
      { time: "11:00", baseline: 122, projected: 118 },
      { time: "12:00", baseline: 130, projected: 124 },
      { time: "13:00", baseline: 144, projected: 133 },
      { time: "14:00", baseline: 128, projected: 137 },
      { time: "15:00", baseline: 116, projected: 129 },
      { time: "16:00", baseline: 110, projected: 119 },
      { time: "17:00", baseline: 104, projected: 112 },
    ],
  },
  {
    id: "p-002",
    name: "Amel Rahmani",
    age: 29,
    condition: "Gestational Diabetes",
    currentGlucose: 138,
    glucoseTrendText: "Rising slowly",
    riskWindowText: "1h 40m",
    riskPercent: 54,
    warningInsight:
      "Post-lunch rise is persistent. Split carbohydrate intake over two smaller meals.",
    successInsight:
      "No nocturnal hypo episodes were detected in the last 5 days.",
    metabolicData: [
      { time: "11:00", baseline: 118, projected: 124 },
      { time: "12:00", baseline: 125, projected: 132 },
      { time: "13:00", baseline: 139, projected: 142 },
      { time: "14:00", baseline: 148, projected: 149 },
      { time: "15:00", baseline: 135, projected: 143 },
      { time: "16:00", baseline: 122, projected: 136 },
      { time: "17:00", baseline: 116, projected: 129 },
    ],
  },
  {
    id: "p-003",
    name: "Youssef Karim",
    age: 41,
    condition: "Type 2 Diabetes",
    currentGlucose: 96,
    glucoseTrendText: "Slight dip expected",
    riskWindowText: "3h 05m",
    riskPercent: 31,
    warningInsight:
      "Late-afternoon dip likely after activity. Keep a small carb snack nearby.",
    successInsight:
      "Average fasting glucose improved by 11 mg/dL over the last 14 days.",
    metabolicData: [
      { time: "11:00", baseline: 114, projected: 109 },
      { time: "12:00", baseline: 108, projected: 103 },
      { time: "13:00", baseline: 103, projected: 100 },
      { time: "14:00", baseline: 99, projected: 97 },
      { time: "15:00", baseline: 97, projected: 95 },
      { time: "16:00", baseline: 98, projected: 94 },
      { time: "17:00", baseline: 101, projected: 96 },
    ],
  },
];

export function DashboardPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [selectedPatientId],
  );

  return (
    <section className="grid gap-3.5">
      <header className="px-0.5 py-1">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
          Digital Twin Insights
        </p>
        <h1 className="mt-1 font-['Sora'] text-[1.75rem] font-bold tracking-tight text-slate-800">
          Patient Monitoring Dashboard
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Patients
          </h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Select a patient to display metabolic insights.
          </p>

          <div className="grid gap-2">
            {patients.map((patient) => {
              const isActive = selectedPatientId === patient.id;

              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
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

              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
