import { Moon } from "lucide-react";

export function FastProgressCard() {
  // Simulating a ~65% completion of the fast
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.65; 
  const offset = circumference - progress * circumference;

  return (
    <article className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 text-center">
      <div className="flex items-center justify-between text-left">
        <h2 className="font-['Sora'] text-[15px] font-bold text-blue-600">Fast Progress</h2>
        <Moon className="h-6 w-6 text-slate-200" fill="currentColor" stroke="transparent" />
      </div>

      <div className="relative mx-auto mt-4 mb-2 flex aspect-square w-48 items-center justify-center">
        <svg className="h-full w-full rotate-[-90deg] transform" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="11"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#059669" // Emerald 600
            strokeWidth="11"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-widest text-[#7a8b99] uppercase">Until Iftar</span>
          <span className="mt-1 font-['Sora'] text-2xl font-bold tracking-tight text-slate-800">4h 22m</span>
          <span className="text-[11px] font-medium text-slate-400 mt-1">Remaining</span>
        </div>
      </div>

      <div className="mt-6 flex justify-between px-2 text-center text-sm">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suhur</p>
          <p className="mt-1 font-bold text-slate-800">04:12 AM</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Iftar</p>
          <p className="mt-1 font-bold text-slate-800">06:44 PM</p>
        </div>
      </div>
    </article>
  );
}
