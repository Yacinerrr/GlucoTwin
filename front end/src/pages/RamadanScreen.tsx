"use client";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { C } from "./tokens";
import { PRAYER_TIMELINE } from "./data";
import { BackHeader } from "./ui";

export function RamadanScreen() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ paddingBottom: 30 }}>
      <BackHeader title="🌙 Mode Ramadan" onBack={() => navigate(-1)} />

      {/* Hero banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.bg} 0%, #0d1f3a 50%, ${C.bg} 100%)`, padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <svg style={{ position: "absolute", top: -20, right: -20, opacity: .08 }} width="120" height="120" viewBox="0 0 120 120">
          <path d="M80 20 A40 40 0 1 1 80 100 A30 30 0 1 0 80 20Z" fill="white" />
          <circle cx="95" cy="35" r="6" fill="white" />
          <circle cx="105" cy="48" r="4" fill="white" />
          <circle cx="88" cy="28" r="3" fill="white" />
        </svg>
        <div className="syne" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Ramadan 1446H</div>
        <div style={{ fontSize: 13, color: C.t2, marginBottom: 18 }}>Alger · 21 Mars 2026</div>
        <div style={{ padding: "16px 22px", background: "rgba(255,255,255,.07)", borderRadius: 14, display: "inline-block", textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 4 }}>Recommandation Suhur ce soir</div>
          <div className="syne" style={{ fontSize: 28, fontWeight: 700, color: "white" }}>
            45g{" "}
            <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,.7)" }}>glucides complexes</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4 }}>
            Basé sur votre profil de jeûne et votre jumeau numérique
          </div>
        </div>
      </div>

      {/* Prayer timeline */}
      <div style={{ padding: "16px 20px 8px" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Horaires du jour</div>
      </div>
      <div style={{ position: "relative", padding: "0 20px" }}>
        <div style={{ position: "absolute", left: 36, top: 18, bottom: 18, width: 2, background: "rgba(255,255,255,.06)" }} />
        {PRAYER_TIMELINE.map((item, i) => (
          <motion.div key={item.label}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            style={{ display: "flex", gap: 16, padding: "12px 0", position: "relative" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.bgS, border: `2px solid ${item.color}45`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, zIndex: 1 }}>
              {item.icon}
            </div>
            <div style={{ paddingTop: 3, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: item.color }}>{item.label}</div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>{item.time} · {item.note}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fasting alert */}
      <div style={{ margin: "8px 16px 16px", background: `${C.dngr}12`, border: `1px solid ${C.dngr}35`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, color: C.dngr, fontWeight: 600, marginBottom: 6 }}>⚠️ Alerte jeûne</div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          Si votre glycémie descend en dessous de <strong>70 mg/dL</strong> avant l'Iftar, votre médecin et votre famille seront automatiquement alertés.
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 10, color: C.t2, padding: "0 20px 16px", opacity: .55, lineHeight: 1.5 }}>
        Le mode Ramadan est indicatif. Consultez votre diabétologue avant tout jeûne.
      </div>
    </motion.div>
  );
}
