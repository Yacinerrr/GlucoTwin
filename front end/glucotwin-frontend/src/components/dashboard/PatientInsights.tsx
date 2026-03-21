import { AlertTriangle, ChevronRight, Goal, ShieldCheck } from "lucide-react";

interface PatientInsightsProps {
  warningInsight: string;
  successInsight: string;
}

export function PatientInsights({
  warningInsight,
  successInsight,
}: PatientInsightsProps) {
  return (
    <section className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      <article className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle size={18} />
        <div>
          <h3 className="mb-1 mt-0 text-sm font-bold">Evening dip insight</h3>
          <p className="m-0 text-xs leading-relaxed text-amber-900/80">
            {warningInsight}
          </p>
        </div>
        <ChevronRight size={18} />
      </article>

      <article className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <ShieldCheck size={18} />
        <div>
          <h3 className="mb-1 mt-0 text-sm font-bold">Stability achievement</h3>
          <p className="m-0 text-xs leading-relaxed text-emerald-900/70">
            {successInsight}
          </p>
        </div>
        <Goal size={18} />
      </article>
    </section>
  );
}
