"use client";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { C } from "./tokens";
import { Divider, SectionLabel } from "./ui";

export function ProfileScreen() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 88 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.sky}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: C.sky }}>
            AM
          </div>
          <div>
            <div className="syne" style={{ fontWeight: 700, fontSize: 17 }}>Amina Mansouri</div>
            <div style={{ fontSize: 12, color: C.t2 }}>Diabète Type 1 · DT1</div>
          </div>
        </div>
        <button onClick={() => navigate("/doctor")} style={{ fontSize: 12, color: C.sky, background: "none", padding: 0 }}>
          Portail médecin
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: 16 }}>
        {[
          { l: "TIR 7j",    v: "74%", c: C.safe },
          { l: "Moy mg/dL", v: "138", c: C.t1   },
          { l: "Hypos 7j",  v: "3",   c: C.attn  },
        ].map(s => (
          <div key={s.l} style={{ background: C.bgS, borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,.05)", textAlign: "center" }}>
            <div className="syne" style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Mon médecin</SectionLabel>
      <div style={{ margin: "0 16px 16px", background: C.bgS, borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, background: `${C.brand}22`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            👨‍⚕️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Dr. Rachid Benali</div>
            <div style={{ fontSize: 12, color: C.t2 }}>Endocrinologue · CHU Alger</div>
          </div>
          <motion.button whileTap={{ scale: 0.95 }}
            style={{ padding: "8px 14px", background: "transparent", color: C.sky, border: `1px solid ${C.sky}40`, borderRadius: 10, fontSize: 12 }}>
            Message
          </motion.button>
        </div>
      </div>

      <SectionLabel>Navigation</SectionLabel>
      <div style={{ margin: "0 16px", background: C.bgS, borderRadius: 14, border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
        {[
          { icon: "⚙️", l: "Paramètres complets", s: "Langue, alertes, unités…", path: "/settings" },
          { icon: "📊", l: "Rapport hebdomadaire", s: "Résumé de la semaine",      path: "/report" },
          { icon: "🌙", l: "Mode Ramadan",         s: "Prédictions au jeûne",      path: "/ramadan" },
        ].map((item, i) => (
          <div key={item.path}>
            {i > 0 && <Divider />}
            <motion.div onClick={() => navigate(item.path)} whileTap={{ scale: 0.98 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14 }}>{item.l}</div>
                  <div style={{ fontSize: 12, color: C.t2 }}>{item.s}</div>
                </div>
              </div>
              <ChevronRight size={16} color={C.t2} />
            </motion.div>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </motion.div>
  );
}
