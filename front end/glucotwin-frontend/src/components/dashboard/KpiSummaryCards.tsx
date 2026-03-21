interface KpiSummaryCardsProps {
  glucoseValue: number;
  glucoseTrendText: string;
  riskWindowText: string;
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

export function KpiSummaryCards({
  glucoseValue,
  glucoseTrendText,
  riskWindowText,
}: KpiSummaryCardsProps) {
  return (
    <>
      <KpiCard
        title="Current Glucose"
        value={`${glucoseValue}`}
        hint={glucoseTrendText}
        accent="#18a36b"
      />
      <KpiCard
        title="Window of Risk"
        value={riskWindowText}
        hint="Active risk interval"
        accent="#2f7fd6"
      />
    </>
  );
}
