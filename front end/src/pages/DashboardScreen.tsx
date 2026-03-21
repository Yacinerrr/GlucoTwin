"use client";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Clock, Activity, Droplets, User, Zap } from "lucide-react";
import { C } from "./tokens";
import { getZone, zoneColor, zoneBg, zoneLabel, trendArrows, TREND_LABEL, buildPoints, toLinePath, toAreaPath, valToY } from "./helpers";
import { MOCK_HISTORY, MOCK_PREDICTION } from "./data";
import { StatCard } from "./ui";
import type { ChartPoint } from "./helpers";
import type { Trend } from "./types";

interface DashboardScreenProps {
  currentGlucose: number;
  ramadanMode: boolean;
}

export function DashboardScreen({ currentGlucose, ramadanMode }: DashboardScreenProps) {
  const navigate = useNavigate();
  const zone  = getZone(currentGlucose);
  const zc    = zoneColor(zone);
  const halo  = zone === "safe" ? "halo-safe" : zone === "attention" ? "halo-attn" : "halo-dngr";

  // Compute trend from last 3 history points
  const trend: Trend = useMemo(() => {
    const recent = MOCK_HISTORY.slice(-3);
    const delta  = recent[recent.length - 1].value - recent[0].value;
    return delta > 8 ? "rising" : delta < -8 ? "falling" : "stable";
  }, []);

  const tir = Math.round(MOCK_HISTORY.filter(d => d.value >= 70 && d.value <= 180).length / MOCK_HISTORY.length * 100);

  // Chart geometry
  const W = 380, H = 130, PAD = 10;
  const MIN_V = 55, MAX_V = 275;
  const histPts = buildPoints(MOCK_HISTORY, W, H, PAD, MIN_V, MAX_V);
  const nowPt   = histPts[histPts.length - 1];

  const predPts: ChartPoint[] = MOCK_PREDICTION.map((d, i) => {
    const mn = MIN_V, mx = MAX_V, rng = mx - mn;
    return {
      x: nowPt.x + (i + 1) * ((W - PAD - nowPt.x) / MOCK_PREDICTION.length),
      y: PAD + (1 - (d.value - mn) / rng) * (H - PAD * 2),
    };
  });

  const histLine = toLinePath(histPts);
  const histArea = toAreaPath(histPts, H);
  const predLine = "M" + nowPt.x.toFixed(1) + "," + nowPt.y.toFixed(1) + " " +
                   predPts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const predArea = `${predLine} L${predPts[predPts.length-1].x.toFixed(1)},${H} L${nowPt.x.toFixed(1)},${H} Z`;

  const s180y = valToY(180, MIN_V, MAX_V, H, PAD);
  const s70y  = valToY(70,  MIN_V, MAX_V, H, PAD);

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ paddingBottom: 88 }}>

      {/* ── Header ── */}
      <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 8px" }}>
        <div>
          <div style={{ fontSize: 12, color: C.t2 }}>Bonjour, Amina {ramadanMode ? "🌙" : "👋"}</div>
          <div className="syne" style={{ fontSize: 19, fontWeight: 700 }}>GlucoTwin</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, background: C.bgS, border: "1px solid rgba(255,255,255,.06)", color: C.t2 }}>
            mg/dL
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/profile")}
            style={{ width: 36, height: 36, borderRadius: "50%", background: C.bgE, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <User size={16} color={C.t2} />
          </motion.button>
        </div>
      </motion.div>

      {/* ── Ramadan Banner ── */}
      <AnimatePresence>
        {ramadanMode && (
          <motion.div key="ramadan-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 10 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4 }}
            style={{ overflow: "hidden", margin: "0 16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: `${C.bgS}CC`, border: "1px solid rgba(255,255,255,.06)", borderRadius: 14 }}>
              <Moon size={18} color={C.attn} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Mode Ramadan actif</div>
                <div style={{ fontSize: 12, color: C.t2 }}>
                  Prochain repas (Iftar) :{" "}
                  <span className="syne" style={{ color: C.attn }}>18:47</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GLUCOSE HERO + HALO ── */}
      <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 16px" }}>
        <div className={halo} style={{ width: 210, height: 210, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 50% 50%, ${zoneBg(zone)} 0%, transparent 68%)` }}>
          <div style={{ width: 178, height: 178, borderRadius: "50%", background: C.bgS, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `2px solid ${zc}28` }}>
            <AnimatePresence mode="wait">
              <motion.span key={currentGlucose} className="syne"
                initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{ fontSize: 78, fontWeight: 800, lineHeight: 1, color: zc, letterSpacing: "-4px" }}>
                {currentGlucose}
              </motion.span>
            </AnimatePresence>
            <span style={{ fontSize: 13, color: C.t2, marginTop: 3 }}>{trendArrows[trend]} {TREND_LABEL[trend]}</span>
          </div>
        </div>
        <motion.div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <motion.span key={zone} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", padding: "4px 16px", borderRadius: 20, background: zoneBg(zone), color: zc }}>
            {zoneLabel(zone)}
          </motion.span>
          <span style={{ fontSize: 12, color: C.t2 }}>Dernière lecture · il y a 3 min</span>
        </motion.div>
      </motion.div>

      {/* ── 24h PREDICTION CHART ── */}
      <motion.div variants={itemVariants} style={{ margin: "0 14px 14px", padding: "14px 10px 14px", background: C.bgS, borderRadius: 18, border: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: C.t2, fontWeight: 500 }}>Glycémie · 24h</span>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.t2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 12, height: 2, background: C.sky, borderRadius: 2 }} /> Réel
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.violet }}>
              <span style={{ display: "inline-block", width: 12, height: 2, background: C.violet, borderRadius: 2, opacity: .7 }} /> Prédit
            </span>
          </div>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.sky}    stopOpacity=".28" />
              <stop offset="100%" stopColor={C.sky}  stopOpacity="0"   />
            </linearGradient>
            <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.violet}   stopOpacity=".22" />
              <stop offset="100%" stopColor={C.violet} stopOpacity="0"   />
            </linearGradient>
          </defs>
          <rect x={PAD} y={PAD}   width={W-PAD*2} height={s180y-PAD}  fill="rgba(214,40,40,.06)" />
          <rect x={PAD} y={s180y} width={W-PAD*2} height={s70y-s180y} fill="rgba(15,158,120,.06)" />
          <rect x={PAD} y={s70y}  width={W-PAD*2} height={H-s70y-PAD} fill="rgba(214,40,40,.06)" />
          <line x1={PAD} x2={W-PAD} y1={s180y} y2={s180y} stroke="rgba(224,123,32,.22)" strokeWidth=".6" strokeDasharray="5,4" />
          <line x1={PAD} x2={W-PAD} y1={s70y}  y2={s70y}  stroke="rgba(214,40,40,.22)" strokeWidth=".6" strokeDasharray="5,4" />
          <path d={histArea} fill="url(#gHist)" />
          <motion.path d={histLine} fill="none" stroke={C.sky} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
          <path d={predArea} fill="url(#gPred)" />
          <motion.path d={predLine} fill="none" stroke={C.violet} strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeOut", delay: 0.8 }} />
          <line x1={nowPt.x} x2={nowPt.x} y1={PAD} y2={H} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          <circle cx={nowPt.x} cy={nowPt.y} r="5" fill={C.sky}>
            <animate attributeName="r"       values="5;8;5"  dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={nowPt.x} cy={nowPt.y} r="3" fill="white" />
          {[0, Math.floor(MOCK_HISTORY.length / 2), MOCK_HISTORY.length - 1].map((idx) => (
            <text key={idx} x={histPts[idx].x} y={H + 14} fontSize="9" fill="rgba(123,145,173,.6)" textAnchor="middle" fontFamily="DM Sans,sans-serif">
              {MOCK_HISTORY[idx].time}
            </text>
          ))}
          <text x={predPts[predPts.length-1].x} y={H+14} fontSize="9" fill={`${C.violet}99`} textAnchor="middle" fontFamily="DM Sans,sans-serif">+8h</text>
        </svg>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "0 14px 14px" }}>
        <StatCard icon={<Clock size={12} color={C.t2} />}    label="TIR"      value={`${tir}%`} color={tir >= 70 ? C.safe : C.attn} />
        <StatCard icon={<Activity size={12} color={C.t2} />} label="Tendance" value="+2.1" />
        <StatCard icon={<Droplets size={12} color={C.t2} />} label="Repas Δ"  value="+28"  color={C.attn} />
      </motion.div>

      {/* ── QUICK ACTIONS ── */}
      <motion.div variants={itemVariants} style={{ padding: "0 14px 12px" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 10 }}>Actions rapides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { emoji: "📷", title: "Scanner repas",  sub: "Analyse IA",      nav: "scan" },
            { emoji: "🔮", title: "Simuler impact", sub: "Jumeau numérique", nav: "simulator"  },
          ].map((a) => (
            <motion.button key={a.nav as string} onClick={() => navigate(`/${a.nav as string}`)} whileTap={{ scale: 0.97 }}
              style={{ background: C.bgS, borderRadius: 14, padding: 16, textAlign: "left", border: "1px solid rgba(255,255,255,.05)", color: C.t1 }}>
              <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{a.emoji}</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{a.sub}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── AI INSIGHT ── */}
      <motion.div variants={itemVariants} style={{ padding: "0 14px 14px" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Insight IA</div>
        <div style={{ background: C.bgS, borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={15} color={C.sky} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Pic post-déjeuner détecté</div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>
                Votre glycémie monte en moyenne de 35 mg/dL après le déjeuner. Envisagez de réduire les glucides ou d'ajuster l'insuline.
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ textAlign: "center", fontSize: 10, color: C.t2, padding: "0 20px 8px", opacity: .55, lineHeight: 1.5 }}>
        Consultez votre médecin avant tout ajustement thérapeutique.
      </div>
    </motion.div>
  );
}
