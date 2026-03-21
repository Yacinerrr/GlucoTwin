"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "./tokens";

export function ScanScreen() {
  const navigate = useNavigate();
  const [scanned, setScanned] = useState<boolean>(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <span className="syne" style={{ fontWeight: 700, fontSize: 18 }}>Scanner un repas</span>
        <span style={{ fontSize: 12, color: C.t2 }}>IA Nutritionnelle</span>
      </div>

      {/* Camera viewfinder */}
      <div style={{ margin: 16, height: 285, background: "#040c18", borderRadius: 20, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#060f1e,#0a1826,#040c18)" }} />
        <div className="corner-anim" style={{ position: "absolute", width: 220, height: 165, zIndex: 2 }}>
          {[
            { top: 0,    left: 0,    borderTop: `3px solid ${C.sky}`, borderLeft: `3px solid ${C.sky}`,    borderRadius: "6px 0 0 0" } as React.CSSProperties,
            { top: 0,    right: 0,   borderTop: `3px solid ${C.sky}`, borderRight: `3px solid ${C.sky}`,   borderRadius: "0 6px 0 0" } as React.CSSProperties,
            { bottom: 0, left: 0,    borderBottom: `3px solid ${C.sky}`, borderLeft: `3px solid ${C.sky}`, borderRadius: "0 0 0 6px" } as React.CSSProperties,
            { bottom: 0, right: 0,   borderBottom: `3px solid ${C.sky}`, borderRight: `3px solid ${C.sky}`, borderRadius: "0 0 6px 0" } as React.CSSProperties,
          ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 28, height: 28, ...s }} />
          ))}
          <div className="scan-line" style={{ position: "absolute", left: 14, right: 14, height: 1, background: `linear-gradient(90deg, transparent, ${C.sky}, transparent)`, opacity: .85 }} />
        </div>
        <div style={{ position: "absolute", bottom: 14, width: "100%", textAlign: "center", fontSize: 12, color: C.t2 }}>
          Placez votre repas dans le cadre
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScanned(true)}
          style={{ flex: 1, padding: 13, background: C.bgS, color: C.sky, border: `1px solid ${C.sky}40`, borderRadius: 12, fontSize: 13, fontWeight: 500 }}>
          📷 Prendre une photo
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }}
          style={{ padding: "13px 18px", background: C.bgS, color: C.t2, border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, fontSize: 13 }}>
          Galerie
        </motion.button>
      </div>

      <AnimatePresence>
        {scanned && (
          <motion.div key="meal-result"
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{ margin: "0 16px 16px", background: C.bgE, borderRadius: 18, padding: 20, border: "1px solid rgba(255,255,255,.08)" }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
              <div style={{ width: 54, height: 54, background: C.bgH, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🥗</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Chakhchoukha aux légumes</div>
                <div style={{ fontSize: 12, color: C.t2 }}>Portion estimée · 380g</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
              <span className="syne" style={{ fontSize: 46, fontWeight: 800, color: C.attn }}>78</span>
              <span style={{ fontSize: 14, color: C.t2 }}>grammes de glucides</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.t2, marginBottom: 7 }}>
                <span>Score de sécurité glycémique</span>
                <span style={{ color: C.attn }}>Modéré ⚠️</span>
              </div>
              <div style={{ height: 7, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
                <motion.div initial={{ width: "0%" }} animate={{ width: "58%" }} transition={{ duration: .7, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ height: "100%", background: C.attn, borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: C.t2 }}>
                <span>🟢 Faible</span><span>🟡 Modéré</span><span>🔴 Élevé</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { l: "Glucides",  v: "78g", c: C.sky },
                { l: "Protéines", v: "22g", c: C.t1  },
                { l: "Lipides",   v: "12g", c: C.t1  },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: 8, background: C.bg, borderRadius: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.c }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: C.t2 }}>{m.l}</div>
                </div>
              ))}
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/simulator")}
              style={{ width: "100%", padding: 15, background: C.brand, color: "white", borderRadius: 12, fontSize: 14, fontWeight: 600, letterSpacing: ".3px" }}>
              🔮 Simuler l'impact sur ma glycémie
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ textAlign: "center", fontSize: 10, color: C.t2, padding: "0 20px 14px", opacity: .55, lineHeight: 1.5 }}>
        Estimations nutritionnelles indicatives. Consultez votre diététicien.
      </div>
    </motion.div>
  );
}
