import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MetabolicPoint {
  time: string;
  baseline: number;
  projected: number;
}

interface MetabolicChartProps {
  data: MetabolicPoint[];
}

export function MetabolicChart({ data }: MetabolicChartProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
          Metabolic Projection
        </h2>
        <p className="m-0 text-[11px] font-bold text-slate-400">Next 6h</p>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7edf5" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#97a6b6", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#97a6b6", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[60, 220]}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} mg/dL`,
                name === "baseline" ? "Baseline" : "Projected",
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="line"
              wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
              formatter={(value) =>
                value === "baseline" ? "Historical Baseline" : "Predicted"
              }
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#2a7de1"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#2fb979"
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400">
        <span>11:00</span>
        <span>NOW</span>
        <span>+6 PREDICTION</span>
      </div>
    </article>
  );
}
