import { Activity, Flame, UtensilsCrossed } from "lucide-react";

export function ActionHub() {
  return (
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
  );
}
