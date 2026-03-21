"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { C } from "./tokens";

interface EmergencyScreenProps {
  currentGlucose: number;
}

export function EmergencyScreen({ currentGlucose }: EmergencyScreenProps) {
  const navigate = useNavigate();
  const [timer, setTimer] = useState<number>(900);

  useEffect(() => {
    const t = setInterval(() => setTimer(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{ minHeight: "100dvh", background: C.dngr, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 40px" }}>

      {/* Header */}
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.22)" }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)}
          style={{ background: "rgba(255,255,255,.22)", color: "white", padding: "7px 16px", borderRadius: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={16} color="white" /> Retour
        </motion.button>
        <span className="syne" style={{ fontSize: 16, fontWeight: 700, color: "white" }}>🚨 URGENCE</span>
        <div style={{ width: 80 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.82)", fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
            Glycémie détectée
          </div>
          <div className="emerg-num syne" style={{ fontSize: 96, fontWeight: 800, color: "white", lineHeight: 1 }}>
            {currentGlucose}
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,.75)", marginTop: 6 }}>
            mg/dL · {currentGlucose < 54 ? "Hypoglycémie sévère" : currentGlucose < 70 ? "Hypoglycémie" : "Hyperglycémie sévère"}
          </div>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}
          style={{ textAlign: "center" }}>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.3 }}>
            Prenez 15g de sucres rapides MAINTENANT
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.82)", marginTop: 10 }}>
            Jus de fruit, soda sucré, ou 3–4 bonbons
          </div>
        </motion.div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { l: "✓ J'ai pris du sucre",  bg: "white",                color: C.dngr, onClick: () => navigate(-1) },
            { l: "📞 Appeler ma famille", bg: "rgba(255,255,255,.2)", color: "white", border: "2px solid rgba(255,255,255,.5)", onClick: () => { window.location.href = "tel:+213555123456"; } },
            { l: "🚑 Appeler le SAMU 21", bg: "rgba(255,255,255,.2)", color: "white", border: "2px solid rgba(255,255,255,.5)", onClick: () => { window.location.href = "tel:21"; } },
          ].map((b) => (
            <motion.button key={b.l} whileTap={{ scale: 0.97 }} onClick={b.onClick}
              style={{ width: "100%", padding: 18, background: b.bg, color: b.color, borderRadius: 14, fontSize: 15, fontWeight: 700, border: b.border || "none" }}>
              {b.l}
            </motion.button>
          ))}
        </div>

        <div style={{ fontSize: 14, color: "rgba(255,255,255,.82)", textAlign: "center", padding: "12px 28px", background: "rgba(255,255,255,.16)", borderRadius: 28 }}>
          ⏱ Revérifier dans <strong>{mm}:{ss}</strong>
        </div>
      </div>
    </motion.div>
  );
}
