import { Zap, Info } from "lucide-react";
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const data = [
  { time: "SUHUR (04:12)", fast: 80, normal: 85 },
  { time: "", fast: 82, normal: 90 },
  { time: "DHUHR", fast: 85, normal: 105 },
  { time: "", fast: 79, normal: 115 },
  { time: "ASR", fast: 76, normal: 80 },
  { time: "", fast: 75, normal: 125 },
  { time: "IFTAR (18:44)", fast: 77, normal: 135 },
];

export function MetabolicShiftCard() {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-['Sora'] text-[15px] font-bold text-slate-800">Metabolic Shift</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">Fasting vs. Baseline Metabolic Signature</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-700"></span>
            </span>
            <span className="font-medium text-slate-600">Fast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            </span>
            <span className="font-medium text-slate-500">Normal</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex-1 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }} 
              dy={15} 
            />
            <Line 
              type="monotone" 
              dataKey="normal" 
              stroke="#cbd5e1" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="fast" 
              stroke="#1d4ed8" /* Blue 700 */
              strokeWidth={3} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm border border-emerald-100/50">
        <div className="flex items-center gap-2.5">
          <Zap className="h-4 w-4 text-emerald-600" fill="currentColor" />
          <span className="text-slate-700 text-[13px] font-medium">Ketone availability increased by <strong className="text-emerald-700 font-bold">14%</strong></span>
        </div>
        <button className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition">
          <Info className="h-3 w-3 text-slate-500" />
        </button>
      </div>
    </article>
  );
}