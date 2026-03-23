import {
  Activity,
  Home,
  ShieldAlert,
  Stethoscope,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/food", label: "Food Log", icon: UtensilsCrossed },
  { to: "/insights", label: "Twin Insights", icon: Activity },
  { to: "/ramadan", label: "Ramadan Mode", icon: Waves },
  { to: "/doctor", label: "Profile", icon: Stethoscope },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col justify-between gap-5 border-b border-slate-200 bg-gradient-to-b from-white to-slate-100 p-4 lg:border-b-0 lg:border-r lg:p-5">
      <div>
        <div className="px-2 py-1 font-['Sora'] text-[1.05rem] font-bold tracking-tight text-blue-700">
          GlucoTwin
        </div>
        <nav
          className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:overflow-visible lg:pb-0"
          aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-200 hover:text-slate-800",
                  ].join(" ")
                }>
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-[11px] font-bold text-white">
          JD
        </div>
        <div>
          <strong className="text-[13px]">John Doe</strong>
          <p className="m-0 text-[11px] text-slate-500">System Profile</p>
        </div>
        <button
          type="button"
          className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-800">
          <ShieldAlert size={14} />
          Sync Device
        </button>
      </div>
    </aside>
  );
}
