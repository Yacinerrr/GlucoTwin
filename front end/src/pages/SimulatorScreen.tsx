"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "./tokens";
import { getZone, zoneColor, zoneBg, buildPoints, toLinePath, toAreaPath, valToY } from "./helpers";
import type { ActivityLevel, GlucosePoint } from "./types";

const ACT_EFFECTS = [0, -15, -30, -55] as const;
const ACT_LABELS  = ["Aucune", "Légère", "Modérée", "Intense"] as const;

export function SimulatorScreen() {
  const navigate = useNavigate();
  const [carbs,    setCarbs]    = useState<number>(65);
  const [insulin,  setInsulin]  = useState<number>(4);
  const [activity, setActivity] = useState<ActivityLevel>(0);

  const peak = useMemo(() =>
    Math.max(50, Math.min(350, Math.round(142 + carbs * 0.85 - insulin * 18 + ACT_EFFECTS[activity]))),
  [carbs, insulin, activity]);

  const zone = getZone(peak);
  const zc   = zoneColor(zone);
  const at2h = useMemo(() => Math.max(60, Math.round(peak * 0.88 - insulin * 5)), [peak, insulin]);
  const at8h = useMemo(() => Math.max(80, Math.min(170, 90 + (185 - peak) * 0.48)), [peak]);

  const simData: GlucosePoint[] = useMemo(() => [
    { time: "Maint.", value: 142 },
    { time: "+30m",   value: Math.round(142 + carbs * 0.3  - insulin * 4) },
    { time: "+1h",    value: Math.round(142 + carbs * 0.65 - insulin * 10 + ACT_EFFECTS[activity] * 0.4) },
    { time: "+1h30",  value: peak },
    { time: "+2h",    value: at2h },
    { time: "+4h",    value: Math.round((at2h + 115) / 2) },
    { time: "+7h",    value: at8h + 5 },
    { time: "+8h",    value: at8h },
  ], [carbs, insulin, activity, peak, at2h, at8h]);

  const sW = 360, sH = 118;
  const sPts  = buildPoints(simData, sW, sH, 10, 50, 280);
  const sLine = toLinePath(sPts);
  const sArea = toAreaPath(sPts, sH);
  const s180y = valToY(180, 50, 280, sH);
  const s70y  = valToY(70,  50, 280, sH);

  const badgeLabel = zone === "safe" ? "✓ ZONE SÛRE" : zone === "attention" ? "⚠ ATTENTION" : "🚨 DANGER";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <span className="syne" style={{ fontWeight: 700, fontSize: 18 }}>🔮 Jumeau Numérique</span>
        <span style={{ fontSize: 12, color: C.t2 }}>Simulation</span>
      </div>

      {/* Peak hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 18px 10px" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Pic glycémique prédit</div>
        <AnimatePresence mode="wait">
          <motion.span key={peak} className="syne"
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ fontSize: 62, fontWeight: 800, lineHeight: 1, color: zc }}>
            {peak}
          </motion.span>
        </AnimatePresence>
        <div style={{ fontSize: 13, color: C.t2, marginTop: 4 }}>mg/dL · dans 1h30</div>
        <motion.div key={zone} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{ marginTop: 12, padding: "10px 26px", borderRadius: 30, background: zoneBg(zone), border: `1px solid ${zc}40`, fontSize: 13, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: zc }}>
          {badgeLabel}
        </motion.div>
      </div>

      {/* Sim chart */}
      <div style={{ margin: "8px 14px 14px", padding: "14px 10px 10px", background: C.bgS, borderRadius: 18, border: "1px solid rgba(255,255,255,.05)" }}>
        <svg width="100%" viewBox={`0 0 ${sW} ${sH}`}>
          <rect x="10" y="10"    width={sW-20} height={s180y-10}   fill="rgba(214,40,40,.06)" />
          <rect x="10" y={s180y} width={sW-20} height={s70y-s180y} fill="rgba(15,158,120,.06)" />
          <rect x="10" y={s70y}  width={sW-20} height={sH-s70y-10} fill="rgba(214,40,40,.06)" />
          <line x1="10" x2={sW-10} y1={s180y} y2={s180y} stroke="rgba(224,123,32,.22)" strokeWidth=".6" strokeDasharray="4,4" />
          <line x1="10" x2={sW-10} y1={s70y}  y2={s70y}  stroke="rgba(214,40,40,.22)"  strokeWidth=".6" strokeDasharray="4,4" />
          <path d={sArea} fill={`${zc}20`} />
          <motion.path d={sLine} fill="none" stroke={zc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            key={`${carbs}-${insulin}-${activity}`}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
          <circle cx={sPts[0].x} cy={sPts[0].y} r="4" fill={C.sky} />
          <circle cx={sPts[3].x} cy={sPts[3].y} r="5" fill={zc} />
          <line x1={sPts[3].x} x2={sPts[3].x} y1="10" y2={sH} stroke={`${zc}30`} strokeWidth="1" strokeDasharray="3,3" />
        </svg>
      </div>

      {/* Controls */}
      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Carbs slider */}
        <div style={{ background: C.bgS, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>🍚 Glucides du repas</span>
            <motion.span key={carbs} initial={{ scale: 1.2, color: C.sky }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className="syne" style={{ fontSize: 20, fontWeight: 700, color: C.sky }}>
              {carbs}g
            </motion.span>
          </div>
          <input type="range" min={0} max={200} value={carbs} onChange={e => setCarbs(Number(e.target.value))}
            style={{ background: `linear-gradient(to right, ${C.sky} ${(carbs / 200) * 100}%, ${C.bgE} ${(carbs / 200) * 100}%)`, accentColor: C.sky }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.t2 }}>
            <span>0g</span>
            <span style={{ color: carbs > 100 ? C.dngr : carbs > 60 ? C.attn : C.safe }}>
              {carbs > 100 ? "Impact très élevé ↑↑" : carbs > 60 ? "Impact modéré ↑" : carbs > 30 ? "Impact léger ↑" : "Impact faible"}
            </span>
            <span>200g</span>
          </div>
        </div>

        {/* Insulin slider */}
        <div style={{ background: C.bgS, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>💉 Dose insuline</span>
            <motion.span key={insulin} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className="syne" style={{ fontSize: 20, fontWeight: 700, color: C.violet }}>
              {insulin}U
            </motion.span>
          </div>
          <input type="range" min={0} max={30} value={insulin} onChange={e => setInsulin(Number(e.target.value))}
            style={{ background: `linear-gradient(to right, ${C.violet} ${insulin/30*100}%, ${C.bgE} ${insulin/30*100}%)` }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.t2 }}>
            <span>0U</span><span style={{ color: C.safe }}>Correction ↓</span><span>30U</span>
          </div>
        </div>

        {/* Activity control */}
        <div style={{ background: C.bgS, borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🏃 Activité physique</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {ACT_LABELS.map((l, i) => (
              <motion.button key={i} onClick={() => setActivity(i as ActivityLevel)} whileTap={{ scale: 0.95 }}
                style={{ padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 500, background: activity === i ? `${C.sky}20` : C.bgE, border: activity === i ? `1px solid ${C.sky}60` : "1px solid rgba(255,255,255,.05)", color: activity === i ? C.sky : C.t2, transition: "all .2s" }}>
                {l}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* 2h / 8h projections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 14 }}>
        {[{ l: "Dans 2 heures", v: at2h }, { l: "Dans 8 heures", v: at8h }].map(s => (
          <div key={s.l} style={{ background: C.bgS, borderRadius: 14, padding: 14, textAlign: "center", border: "1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize: 11, color: C.t2, marginBottom: 4 }}>{s.l}</div>
            <AnimatePresence mode="wait">
              <motion.div key={s.v} className="syne" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                style={{ fontSize: 28, fontWeight: 700, color: zoneColor(getZone(s.v)) }}>
                {s.v}
              </motion.div>
            </AnimatePresence>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>mg/dL</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/journal")}
          style={{ width: "100%", padding: 15, background: C.brand, color: "white", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
          Enregistrer dans le journal
        </motion.button>
      </div>
      <div style={{ textAlign: "center", fontSize: 10, color: C.t2, padding: "0 20px 14px", opacity: .55, lineHeight: 1.5 }}>
        Simulation indicative. Consultez votre médecin avant tout ajustement.
      </div>
    </motion.div>
  );
}
