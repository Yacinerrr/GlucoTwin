export function HydrationCard() {
  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 lg:p-6">
      <div>
        <h2 className="font-['Sora'] text-[15px] font-bold text-[#1f498c]">Hydration Strategy</h2>
        
        <div className="mt-5 flex items-end justify-between">
          <p className="text-[13px] font-bold text-slate-700">Post-Iftar Goal</p>
          <p className="font-['Sora'] text-sm font-bold text-emerald-600">
            1.2L <span className="text-xs font-semibold text-slate-400">/ 2.0L</span>
          </p>
        </div>
        
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: "60%" }}></div>
        </div>
      </div>
      
      <p className="mt-5 text-[11px] font-medium italic text-slate-500 leading-relaxed md:pr-2 lg:mt-0">
        Tip: Sip slowly between Taraweeh prayers to maximize absorption.
      </p>
    </article>
  );
}