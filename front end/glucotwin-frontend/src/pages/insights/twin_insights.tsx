import { AlertTriangle, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
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

type WeeklyScorePoint = {
  key: string;
  value: number;
  color?: string;
};

type RiskMeal = {
  id: string;
  meal: string;
  impact: string;
};

type RiskWindow = {
  id: string;
  title: string;
  range: string;
  severity: "urgent" | "moderate";
};

const scoreCards = [
  {
    title: "Weekly TIR",
    subtitle: "Time in target glucose range",
    value: "82",
    unit: "%",
    trend: "+4.2%",
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Health Score",
    subtitle: "Metabolic stability index",
    value: "94.2",
    unit: "",
    trend: "+1.7",
    color: "from-indigo-500 to-blue-600",
  },
  {
    title: "Cautious Spike Analysis",
    subtitle: "Lunch peak confidence",
    value: "94",
    unit: "%",
    trend: "new",
    color: "from-amber-500 to-orange-500",
  },
];

const weeklyIsfData: WeeklyScorePoint[] = [
  { key: "17 JUN", value: 66 },
  { key: "18 JUN", value: 71 },
  { key: "19 JUN", value: 64 },
  { key: "20 JUN", value: 78 },
  { key: "21 JUN", value: 81 },
  { key: "22 JUN", value: 86 },
  { key: "23 JUN", value: 90, color: "#0f4aa0" },
];

const riskyMeals: RiskMeal[] = [
  { id: "m1", meal: "White Baguette", impact: "+48 mg/dL" },
  { id: "m2", meal: "Orange Juice", impact: "+36 mg/dL" },
  { id: "m3", meal: "Sushi Platter", impact: "+44 mg/dL" },
];

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
        <span className={`bg-gradient-to-r ${color} bg-clip-text text-4xl font-extrabold text-transparent`}>
          {value}
        </span>
        <span className="pb-1 text-sm font-bold text-slate-500">{unit}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-[82%] rounded-full bg-gradient-to-r ${color}`} />
      </div>
    </article>
  );
}

function InsulinSensitivityTrend() {
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

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyIsfData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#edf2f7" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
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
              {weeklyIsfData.map((entry) => (
                <Cell key={entry.key} fill={entry.color ?? "#8eb3de"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function TopRiskyMeals() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">Top Risky Meals</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">Highest post-meal spikes this week</p>

      <div className="grid gap-2">
        {riskyMeals.map((meal, idx) => (
          <div
            key={meal.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded bg-amber-100 text-[10px] font-bold text-amber-700">
                {idx + 1}
              </span>
              <span className="text-sm font-semibold text-slate-700">{meal.meal}</span>
            </div>
            <span className="text-xs font-bold text-rose-600">{meal.impact}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
      >
        View all meal data
      </button>
    </article>
  );
}

function RecurringRiskWindows() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">Recurring Risk Windows</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">System detected patterns</p>

      <div className="grid gap-2">
        {recurringWindows.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-bold text-slate-700">{item.title}</p>
              <span
                className={[
                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  item.severity === "urgent"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}
              >
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
      <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">Ramadan Adaptation</h2>
      <p className="mt-1 text-xs text-slate-500">
        Recalibrating for fasting windows. Your Twin has updated meal slots and fasting-touch baseline.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Nightline stability</p>
          <p className="mt-1 text-lg font-extrabold text-slate-700">92%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Iftar risk</p>
          <p className="mt-1 text-lg font-extrabold text-slate-700">1.2h</p>
        </div>
      </div>
    </article>
  );
}

function FooterLearningBanner() {
  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 text-center">
      <h3 className="m-0 font-['Sora'] text-lg font-bold text-blue-800">Your Twin is learning.</h3>
      <p className="mx-auto mt-1 max-w-3xl text-sm text-slate-600">
        We processed 42,800 data points from your CGM and lifestyle logs this week.
        Your digital twin is now 89% accurate in predicting your glucose response to new meals.
      </p>

      <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
        >
          <ArrowUpRight size={14} />
          Download Medical Report
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          <ShieldCheck size={14} />
          Share with Doctor
        </button>
      </div>
    </section>
  );
}

export function TwinInsightsPage() {
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

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {scoreCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <InsulinSensitivityTrend />
        <TopRiskyMeals />
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