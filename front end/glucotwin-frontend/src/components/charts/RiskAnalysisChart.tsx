import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface RiskAnalysisChartProps {
  risk: number;
}

export function RiskAnalysisChart({ risk }: RiskAnalysisChartProps) {
  const normalizedRisk = Math.max(0, Math.min(100, risk));

  const data = [
    { name: "Risk", value: normalizedRisk },
    { name: "Safe", value: 100 - normalizedRisk },
  ];

  return (
    <article className="grid justify-items-center rounded-2xl border border-slate-200 border-t-4 border-t-amber-700 bg-white p-3.5">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        Risk Analysis
      </p>

      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={45}
              startAngle={90}
              endAngle={-270}
              stroke="none">
              <Cell fill="#996336" />
              <Cell fill="#f0e2d5" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 grid place-items-center">
          <span className="text-lg font-extrabold text-amber-900">
            {normalizedRisk}%
          </span>
        </div>
      </div>

      <p className="m-0 text-xs font-semibold text-slate-500">
        Hyperglycemia risk probability
      </p>
    </article>
  );
}
