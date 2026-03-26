import { AlertCircle, Radio } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="mx-auto my-0 grid min-h-screen max-w-[1400px] grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-[0_14px_35px_rgba(24,41,70,0.08)] md:my-3 md:rounded-3xl lg:grid-cols-[250px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col bg-slate-50">
        <header className="flex items-center justify-end gap-3 px-4 pt-4 md:px-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Radio size={14} />
            112 mg/dL
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-rose-700">
            <AlertCircle size={14} />
            Emergency Alert
          </button>
        </header>
        <main className="min-w-0 px-4 pb-5 pt-3 md:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
