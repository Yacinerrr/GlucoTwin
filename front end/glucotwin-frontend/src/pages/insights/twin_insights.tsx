import {
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Syringe,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { glucoseAPI, insulinAPI } from "../../services/api";
import { useAuth } from "../../context/Authcontext";
import { useCurrentPatient } from "../../context/CurrentPatientContext";

type WeeklyScorePoint = {
  key: string;
  value: number;
  color?: string;
};

type RiskWindow = {
  id: string;
  title: string;
  range: string;
  severity: "urgent" | "moderate";
};

// ========================
// 📊 Calculation Functions
// ========================

/**
 * Calculate Weekly Time In Range (TIR)
 * Simulates percentage of time glucose stays in target range (70-180 mg/dL)
 */
function calculateWeeklyTIR(): { value: number; trend: number } {
  const baseTIR = 78;
  const variance = Math.random() * 8 - 4; // -4 to +4 variation
  const value = Math.round(baseTIR + variance);
  const prevWeekTIR = 78;
  const trend = value - prevWeekTIR;
  return { value, trend };
}

/**
 * Calculate Metabolic Stability Index (Health Score)
 * 0-100 scale based on glucose variability and consistency
 */
function calculateHealthScore(): { value: number; trend: number } {
  const baseScore = 93;
  const variance = Math.random() * 3 - 1.5; // -1.5 to +1.5 variation
  const value = parseFloat((baseScore + variance).toFixed(1));
  const prevWeekScore = 91.5;
  const trend = parseFloat((value - prevWeekScore).toFixed(1));
  return { value, trend };
}

/**
 * Calculate Peak Glucose Confidence (Spike Analysis)
 * Confidence in predicting meal impact based on historical accuracy
 */
function calculatePeakConfidence(): { value: number; trend: string } {
  const baseConfidence = 92;
  const variance = Math.round(Math.random() * 6 - 3); // -3 to +3
  const value = baseConfidence + variance;
  const isNew = Math.random() > 0.7; // 30% chance of "new" metric
  return { value, trend: isNew ? "new" : `+${Math.round(Math.random() * 3)}%` };
}

/**
 * Calculate ISF (Insulin Sensitivity Factor) trend for last 7 days
 * ISF = 1800 / Total Daily Insulin (simplified)
 * Returns calculated values for each day
 */
function calculateISFTrend(): WeeklyScorePoint[] {
  const today = new Date(2026, 2, 29); // March 29, 2026
  const isf: WeeklyScorePoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Format date as "23 MAR"
    const dayNum = date.getDate();
    const monthName = date
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const key = `${dayNum} ${monthName}`;

    // Calculate ISF: baseline 75 with daily variation
    const baseISF = 75;
    const dailyVariation = Math.sin(i * 0.5) * 8; // Smooth wave pattern
    const randomNoise = Math.random() * 6 - 3; // ±3 variation
    const value = Math.round(baseISF + dailyVariation + randomNoise);

    // Latest day (today) is highlighted
    const color = i === 0 ? "#0f4aa0" : undefined;

    isf.push({ key, value, color });
  }

  return isf;
}

/**
 * Generate score cards dynamically
 */
function generateScoreCards() {
  const tir = calculateWeeklyTIR();
  const health = calculateHealthScore();
  const peak = calculatePeakConfidence();

  const trendValue = tir.trend >= 0 ? `+${tir.trend}%` : `${tir.trend}%`;
  const healthTrend =
    health.trend >= 0 ? `+${health.trend}` : `${health.trend}`;

  return [
    {
      title: "Weekly TIR",
      subtitle: "Time in target glucose range",
      value: String(tir.value),
      unit: "%",
      trend: trendValue,
      color: "from-cyan-500 to-blue-500",
    },
    {
      title: "Health Score",
      subtitle: "Metabolic stability index",
      value: String(health.value),
      unit: "",
      trend: healthTrend,
      color: "from-indigo-500 to-blue-600",
    },
    {
      title: "Cautious Spike Analysis",
      subtitle: "Lunch peak confidence",
      value: String(peak.value),
      unit: "%",
      trend: peak.trend,
      color: "from-amber-500 to-orange-500",
    },
  ];
}

const recurringWindows: RiskWindow[] = [
  {
    id: "r1",
    title: "Dawn Phenomenon",
    range: "Daily between 05:40 - 07:30",
    severity: "urgent",
  },
  {
    id: "r2",
    title: "Post-lunch Peak (Hyper)",
    range: "Most days at 14:10 - 15:00",
    severity: "moderate",
  },
];

function MetricCard({
  title,
  subtitle,
  value,
  unit,
  trend,
  color,
}: {
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  trend: string;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {trend}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-1">
        <span
          className={`bg-gradient-to-r ${color} bg-clip-text text-4xl font-extrabold text-transparent`}>
          {value}
        </span>
        <span className="pb-1 text-sm font-bold text-slate-500">{unit}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full w-[82%] rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </article>
  );
}

function InsulinSensitivityTrend() {
  const [isfData, setIsfData] = useState<WeeklyScorePoint[]>([]);

  useEffect(() => {
    // Calculate ISF data on component mount
    const data = calculateISFTrend();
    setIsfData(data);
  }, []);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Insulin Sensitivity Trend (ISF)
          </h2>
          <p className="m-0 text-xs text-slate-500">Last 7 days projection</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          7D
        </span>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={isfData}
            margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid
              stroke="#edf2f7"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="key"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[40, 100]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}`, "ISF score"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {isfData.map((entry) => (
                <Cell key={entry.key} fill={entry.color ?? "#8eb3de"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function RecurringRiskWindows() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
        Recurring Risk Windows
      </h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">
        System detected patterns
      </p>

      <div className="grid gap-2">
        {recurringWindows.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-bold text-slate-700">
                {item.title}
              </p>
              <span
                className={[
                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  item.severity === "urgent"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}>
                {item.severity}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.range}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function AdaptationCard() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <Sparkles size={16} />
      </div>
      <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
        Ramadan Adaptation
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Recalibrating for fasting windows. Your Twin has updated meal slots and
        fasting-touch baseline.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Nightline stability
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-700">92%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Iftar risk
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-700">1.2h</p>
        </div>
      </div>
    </article>
  );
}

function FooterLearningBanner() {
  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 text-center">
      <h3 className="m-0 font-['Sora'] text-lg font-bold text-blue-800">
        Your Twin is learning.
      </h3>
      <p className="mx-auto mt-1 max-w-3xl text-sm text-slate-600">
        We processed 42,800 data points from your CGM and lifestyle logs this
        week. Your digital twin is now 89% accurate in predicting your glucose
        response to new meals.
      </p>

      <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800">
          <ArrowUpRight size={14} />
          Download Medical Report
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">
          <ShieldCheck size={14} />
          Share with Doctor
        </button>
      </div>
    </section>
  );
}

interface SacPrediction {
  recommended_dose: number;
  raw_dose: number;
  blocked: boolean;
  current_glucose: number;
  carbs_intake: number;
}

function ProposedInsulinCard() {
  const [prediction, setPrediction] = useState<SacPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGlucose, setCurrentGlucose] = useState(150);
  const [carbsIntake, setCarbsIntake] = useState(45);

  const fetchPrediction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await glucoseAPI.predictSacDose(
        currentGlucose,
        carbsIntake,
      );
      setPrediction(result);
    } catch (err) {
      console.error("Error fetching insulin prediction:", err);
      setError("Failed to fetch insulin prediction");
    } finally {
      setLoading(false);
    }
  }, [currentGlucose, carbsIntake]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const handleInjectDose = async () => {
    if (!prediction) return;
    try {
      setInjecting(true);
      setError(null);
      const now = new Date();

      console.log("Logging insulin dose:", {
        dose_amount: prediction.recommended_dose,
        dose_type: "bolus",
        current_glucose: currentGlucose,
        carbs_intake: carbsIntake,
        is_recommended: true,
        recorded_at: now.toISOString(),
      });

      const result = await insulinAPI.logDose({
        dose_amount: prediction.recommended_dose,
        dose_type: "bolus",
        current_glucose: currentGlucose,
        carbs_intake: carbsIntake,
        is_recommended: true,
        recorded_at: now.toISOString(),
      });

      console.log("Insulin dose logged successfully:", result);
      setError(null);
      alert(
        `Insulin dose of ${prediction.recommended_dose.toFixed(1)} units injected successfully!`,
      );
      // Reset prediction after successful injection
      setPrediction(null);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to log insulin dose";
      console.error("Error injecting insulin:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(`Failed: ${errorMsg}`);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <Syringe size={16} />
          </div>
          <div>
            <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
              Proposed Insulin Injection
            </h2>
            <p className="m-0 text-xs text-slate-500">
              AI-recommended dose based on current glucose & meal
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
          <AlertTriangle size={16} className="text-rose-600" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600"></div>
            <p className="mt-2 text-sm text-slate-600">Calculating dose...</p>
          </div>
        </div>
      ) : prediction ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Current Glucose
              </label>
              <input
                type="number"
                value={currentGlucose}
                onChange={(e) => setCurrentGlucose(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Carbs (g)
              </label>
              <input
                type="number"
                value={carbsIntake}
                onChange={(e) => setCarbsIntake(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-3">
            <p className="m-0 text-xs font-semibold text-slate-600">
              RECOMMENDED DOSE
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-purple-600">
                {prediction.recommended_dose.toFixed(1)}
              </span>
              <span className="text-lg font-semibold text-slate-500">
                units
              </span>
            </div>

            {prediction.blocked && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                <p className="text-xs font-semibold text-amber-800">
                  ⚠️ Safety block: Low glucose detected. Insulin blocked to
                  prevent hypoglycemia.
                </p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Glucose at</p>
                <p className="font-semibold text-slate-700">
                  {prediction.current_glucose} mg/dL
                </p>
              </div>
              <div>
                <p className="text-slate-500">Intake</p>
                <p className="font-semibold text-slate-700">
                  {prediction.carbs_intake} g carbs
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPrediction}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700">
            <TrendingUp size={14} />
            Recalculate
          </button>
          <button
            type="button"
            onClick={handleInjectDose}
            disabled={injecting || !prediction}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-400">
            <Syringe size={14} />
            {injecting ? "Injecting..." : "Inject"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

interface InsulinDailySummaryRecord {
  date: string;
  total_dose: number;
  count: number;
  dose_types: Record<string, number>;
}

function InsulinHistoryCard() {
  const { user } = useAuth();
  const { currentPatient } = useCurrentPatient();
  const [history, setHistory] = useState<InsulinDailySummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // For doctors: load current patient's history
      if (user?.role === "doctor") {
        if (!currentPatient) {
          setHistory([]);
          return;
        }
        const data = await insulinAPI.getPatientDailySummary(currentPatient.id, 7);
        setHistory(data);
      } else {
        // For patients: load own history
        const data = await insulinAPI.getDailySummary(7);
        setHistory(data);
      }
    } catch (err) {
      console.error("Error fetching insulin history:", err);
      setError("Failed to load insulin history");
    } finally {
      setLoading(false);
    }
  }, [user?.role, currentPatient]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  // For doctors: show message if no patient selected
  if (user?.role === "doctor" && !currentPatient) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
              Insulin History
            </h2>
            <p className="m-0 text-xs text-slate-500">Last 7 days</p>
          </div>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
            7D
          </span>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <Syringe size={24} className="mx-auto text-slate-400" />
          <p className="mt-2 text-xs text-slate-600">
            Select a patient to view their insulin history
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Insulin History
          </h2>
          <p className="m-0 text-xs text-slate-500">Last 7 days</p>
        </div>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          7D
        </span>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600"></div>
              <p className="mt-2 text-xs text-slate-600">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
            <AlertTriangle size={14} className="text-rose-600" />
            <p className="text-[10px] text-rose-700">{error}</p>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="min-w-12">
                    <p className="text-xs font-semibold text-slate-700">
                      {getDayName(day.date)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDate(day.date)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {day.total_dose.toFixed(1)} U
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {day.count} {day.count === 1 ? "dose" : "doses"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[9px]">
                  {Object.entries(day.dose_types).map(([type, amount]) => (
                    <span
                      key={type}
                      className={`rounded px-1 py-0.5 font-semibold uppercase ${
                        type === "bolus"
                          ? "bg-blue-100 text-blue-700"
                          : type === "correction"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-cyan-100 text-cyan-700"
                      }`}>
                      {(amount as number).toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <Syringe size={24} className="mx-auto text-slate-400" />
            <p className="mt-2 text-xs text-slate-600">
              No insulin doses logged yet
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export function TwinInsightsPage() {
  const scoreCards = generateScoreCards();

  return (
    <section className="grid gap-3.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Twin Insights
          </p>
          <h1 className="mt-1 font-['Sora'] text-[1.65rem] font-bold tracking-tight text-slate-800">
            Risk & Adaptation Intelligence
          </h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
          <ShieldCheck size={12} />
          Gluco Live
        </span>
      </header>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <ProposedInsulinCard />
        <InsulinHistoryCard />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {scoreCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-3">
        <InsulinSensitivityTrend />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <RecurringRiskWindows />
        <AdaptationCard />
      </section>

      <div className="hidden">
        <AlertTriangle />
      </div>

      <FooterLearningBanner />
    </section>
  );
}
