import { TriangleAlert } from "lucide-react";

export function SafetyProtocolCard() {
  return (
    <article className="flex h-full flex-col justify-center rounded-2xl border-y border-r border-[#e6dbc8] border-l-[6px] border-l-[#a66a38] bg-[#f2e7da]/40 p-5 shadow-sm md:flex-row md:items-center md:gap-5 lg:p-6 lg:gap-6">
      <div className="mb-4 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#e3d1bb] text-[#935f30] md:mb-0">
        <TriangleAlert className="h-6 w-6" fill="currentColor" stroke="#e3d1bb" strokeWidth={1} />
      </div>
      <div className="flex-1">
        <h2 className="font-['Sora'] text-[15px] font-bold text-[#7a481f]">Safety Protocol</h2>
        <p className="mt-1.5 text-[13px] text-[#5e412f] leading-relaxed md:pr-4">
          <strong className="font-bold">Pre-Suhur Adjustment:</strong> Reduce basal insulin by 15% based on nocturnal data.
        </p>
        <div className="mt-4 flex gap-2.5">
          <button className="rounded-lg bg-[#8c4613] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#6e370e] shadow-sm">
            Apply Update
          </button>
          <button className="rounded-lg border border-[#e2d5c3] bg-white px-5 py-2.5 text-[13px] font-bold text-[#8c4613] transition hover:bg-[#faf7f2] shadow-sm">
            View Data
          </button>
        </div>
      </div>
    </article>
  );
}