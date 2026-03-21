"use client";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import { C } from "./tokens";
import { zoneColor } from "./helpers";
import { HEAT_DATA } from "./data";
import { BackHeader } from "./ui";

export function ReportScreen() {
  const navigate = useNavigate();
  const tir    = 74;
  const r      = 54;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - tir / 100);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ paddingBottom: 30 }}>
      <BackHeader title="Rapport · 7 jours" onBack={() => navigate(-1)}
        right={<span style={{ fontSize: 12, color: C.sky, cursor: "pointer" }}>PDF</span>}
      />

      {/* TIR ring */}
      <div style={{ margin: 16, padding: "22px 20px", background: C.bgS, borderRadius: 18, border: "1px solid rgba(255,255,255,.05)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 600 }}>
          Temps en zone (TIR)
        </div>
        <svg viewBox="0 0 130 130" width={130} height={130}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="11" />
          <motion.circle cx="65" cy="65" r={r} fill="none" stroke={C.safe} strokeWidth="11"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
            transform="rotate(-90 65 65)"
          />
          <text x="65" y="62" textAnchor="middle" fontFamily="Syne,sans-serif" fontSize="28" fontWeight="800" fill={C.safe}>{tir}%</text>
          <text x="65" y="78" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill={C.t2}>objectif 70%</text>
        </svg>
        <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>15 mars – 21 mars 2026</div>
      </div>

      {/* Heatmap */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: 11, color: C.t2, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 600 }}>
          Heatmap · Glycémie moyenne
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {HEAT_DATA.map(({ d, v, z }) => {
            const bg = z === "safe" ? "rgba(15,158,120,.26)" : z === "attention" ? "rgba(224,123,32,.3)" : "rgba(214,40,40,.26)";
            return (
              <motion.div key={d}
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{ aspectRatio: "1", borderRadius: 8, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 10 }}>
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 9 }}>{d}</span>
                <span style={{ fontWeight: 600, color: zoneColor(z) }}>{v}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 14px" }}>
        {[
          { l: "Glycémie moy.", v: "152", s: "mg/dL",        c: C.t1   },
          { l: "Écart-type",    v: "±42", s: "mg/dL",        c: C.attn },
          { l: "Hypos totaux",  v: "3",   s: "épisodes",     c: C.dngr },
          { l: "Hypers totaux", v: "8",   s: "épisodes",     c: C.attn },
          { l: "Meilleur jour", v: "Ven", s: "TIR 92%",      c: C.safe },
          { l: "Série sûre",    v: "14h", s: "consécutives", c: C.safe },
        ].map(s => (
          <div key={s.l} style={{ background: C.bgS, borderRadius: 12, padding: "14px 12px", border: "1px solid rgba(255,255,255,.05)", display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, color: C.t2, textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 500 }}>{s.l}</span>
            <span className="syne" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: s.c }}>{s.v}</span>
            <span style={{ fontSize: 11, color: C.t2 }}>{s.s}</span>
          </div>
        ))}
      </div>

      {/* AI insights */}
      <div style={{ margin: "0 16px 14px", background: C.bgE, borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ fontSize: 11, color: C.sky, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".8px" }}>
          🤖 Insights IA
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.75 }}>
          Les pics surviennent principalement après le déjeuner (12h30–14h). Mercredi et samedi montrent une variabilité élevée corrélée à des repas glucidiques.
          <br /><br />
          <span style={{ color: C.safe, fontWeight: 600 }}>Recommandation :</span>{" "}
          Envisagez d'augmenter la dose pré-déjeuner de 1–2U en consultation avec Dr. Benali.
        </div>
      </div>

      <div style={{ padding: "0 16px 8px" }}>
        <motion.button whileTap={{ scale: 0.97 }}
          style={{ width: "100%", padding: 15, background: C.brand, color: "white", borderRadius: 12, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Share2 size={16} /> Partager avec mon médecin
        </motion.button>
      </div>
      <div style={{ textAlign: "center", fontSize: 10, color: C.t2, padding: "8px 20px 16px", opacity: .55 }}>
        Rapport généré par IA. Consultez votre médecin avant tout ajustement.
      </div>
    </motion.div>
  );
}
