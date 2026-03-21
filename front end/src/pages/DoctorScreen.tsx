"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { C } from "./tokens";
import { zoneColor, zoneBg, toLinePath } from "./helpers";
import type { ChartPoint } from "./helpers";
import { PATIENTS } from "./data";
import { BackHeader } from "./ui";
import type { Patient } from "./types";

interface SparklineProps { data: number[]; color: string; }

function Sparkline({ data, color }: SparklineProps) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const W = 50, H = 24;
  const pts: ChartPoint[] = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 4 - ((v - mn) / rng) * (H - 8),
  }));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <motion.path d={toLinePath(pts)} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }} />
    </svg>
  );
}

function PatientRow({ p }: { p: Patient }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} className={p.critical ? "crit-bord" : ""}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: C.bgS, margin: "0 16px 8px", borderRadius: 12, border: "1px solid rgba(255,255,255,.05)", borderLeft: p.critical ? `3px solid ${C.dngr}` : "1px solid rgba(255,255,255,.05)", cursor: "pointer" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: p.critical ? `${C.dngr}20` : `${C.sky}14`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: p.critical ? C.dngr : C.sky }}>
        {p.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
        <div style={{ fontSize: 11, color: C.t2 }}>{p.type} · {p.last}</div>
      </div>
      <Sparkline data={p.sparkline} color={zoneColor(p.zone)} />
      <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, padding: "4px 10px", borderRadius: 20, flexShrink: 0, background: zoneBg(p.zone), color: zoneColor(p.zone) }}>
        {p.glucose}
      </div>
    </motion.div>
  );
}

export function DoctorScreen() {
  const navigate = useNavigate();
  const critical = PATIENTS.filter(p => p.critical);
  const others   = PATIENTS.filter(p => !p.critical);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ paddingBottom: 30 }}>
      <BackHeader title="👨‍⚕️ Portail Médecin" onBack={() => navigate(-1)}
        right={<span style={{ fontSize: 12, color: C.t2 }}>8 patients</span>}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 16px", padding: "11px 14px", background: C.bgS, borderRadius: 12, border: "1px solid rgba(255,255,255,.06)" }}>
        <Search size={16} color={C.t2} />
        <input placeholder="Rechercher un patient…"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontFamily: "DM Sans,sans-serif", fontSize: 14 }} />
      </div>

      <div style={{ fontSize: 11, color: C.dngr, padding: "4px 16px 10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".8px" }}>
        🚨 Critique · {critical.length} patient
      </div>
      {critical.map(p => <PatientRow key={p.initials} p={p} />)}

      <div style={{ fontSize: 11, color: C.t2, padding: "10px 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".8px" }}>
        Tous les patients
      </div>
      <AnimatePresence>
        {others.map((p, i) => (
          <motion.div key={p.initials} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <PatientRow p={p} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div style={{ height: 20 }} />
    </motion.div>
  );
}
