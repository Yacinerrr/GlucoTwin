import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Flame,
  Goal,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";

function ProjectionCurve() {
  return (
    <svg
      viewBox="0 0 900 200"
      className="h-[200px] w-full"
      role="img"
      aria-label="Glucose projection curve">
      <defs>
        <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2a7de1" />
          <stop offset="100%" stopColor="#28b06f" />
        </linearGradient>
      </defs>

      <line x1="0" y1="22" x2="900" y2="22" stroke="#ebf0f6" strokeWidth="2" />
      <line
        x1="0"
        y1="178"
        x2="900"
        y2="178"
        stroke="#ebf0f6"
        strokeWidth="2"
      />

      <path
        d="M20,145 C120,136 130,70 220,86 C298,101 302,118 390,104"
        fill="none"
        stroke="url(#lineGlow)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="390"
        cy="104"
        r="6"
        fill="#2b7edc"
        stroke="#fff"
        strokeWidth="3"
      />
      <path
        d="M390,104 C480,90 520,158 600,146 C675,132 700,64 785,90"
        fill="none"
        stroke="#69a9eb"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="8 8"
      />
      <text x="788" y="78" fill="#6fb98f" fontSize="11" fontWeight="800">
        OPTIMAL RANGE
      </text>
    </svg>
  );
}

function KpiCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-3.5"
      style={{ borderTop: `4px solid ${accent}` }}>
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {title}
      </p>
      <p className="mb-1 mt-3 text-[2rem] font-extrabold leading-none text-slate-700">
        {value}
      </p>
      <p className="m-0 text-xs font-semibold text-slate-500">{hint}</p>
    </article>
  );
}

export function DashboardPage() {
  return (
    <section className="grid gap-3.5">
      <header className="px-0.5 py-1">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
          Digital Twin Insights
        </p>
        <h1 className="mt-1 font-['Sora'] text-[1.75rem] font-bold tracking-tight text-slate-800">
          Metabolic Projection
        </h1>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
        <div className="flex justify-end gap-3.5 text-[11px] font-bold text-slate-400">
          <span>Historical Baseline</span>
          <span>Predicted Next 6h</span>
        </div>
        <ProjectionCurve />
        <div className="flex justify-between text-[11px] font-bold text-slate-400">
          <span>11:00</span>
          <span>NOW</span>
          <span>+6 PREDICTION</span>
        </div>
      </article>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          title="Current Glucose"
          value="112"
          hint="Stable in 6m"
          accent="#18a36b"
        />
        <article className="grid justify-items-center rounded-2xl border border-slate-200 border-t-4 border-t-amber-700 bg-white p-3.5">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
            Risk Analysis
          </p>
          <div className="relative my-3 grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#996336_0_65%,#f0e2d5_65%_100%)]">
            <div className="absolute inset-3 rounded-full bg-white" />
            <span className="relative font-extrabold text-amber-900">65%</span>
          </div>
          <p className="m-0 text-xs font-semibold text-slate-500">
            Hyperglycemia risk probability
          </p>
        </article>
        <KpiCard
          title="Window of Risk"
          value="2h 15m"
          hint="Active 12:30 - 14:45"
          accent="#2f7fd6"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
        <h2 className="m-0 font-['Sora'] text-base font-bold">Action Hub</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Log events to keep your digital twin accurate.
        </p>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
            <UtensilsCrossed size={17} />
            Add Meal
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
            <Activity size={17} />
            Inject Insulin
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
            <Flame size={17} />
            Log Activity
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <article className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={18} />
          <div>
            <h3 className="mb-1 mt-0 text-sm font-bold">Evening dip insight</h3>
            <p className="m-0 text-xs leading-relaxed text-amber-900/80">
              Your peak risk appears at 13:20. Reduce carbs by 10g at lunch to
              flatten spikes.
            </p>
          </div>
          <ChevronRight size={18} />
        </article>
        <article className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <ShieldCheck size={18} />
          <div>
            <h3 className="mb-1 mt-0 text-sm font-bold">
              Stability achievement
            </h3>
            <p className="m-0 text-xs leading-relaxed text-emerald-900/70">
              Safe-range time increased by 8% this week compared to your monthly
              baseline.
            </p>
          </div>
          <Goal size={18} />
        </article>
      </section>
    </section>
  );
}
