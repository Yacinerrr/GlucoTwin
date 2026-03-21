"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { C } from "./tokens";
import { BackHeader, Divider, SectionLabel, Toggle } from "./ui";
import type { LangKey, Unit } from "./types";

interface SettingsScreenProps {
  ramadanMode: boolean;
  onRamadanToggle: () => void;
}

export function SettingsScreen({ ramadanMode, onRamadanToggle }: SettingsScreenProps) {
  const navigate = useNavigate();
  const [lang, setLang] = useState<LangKey>("fr");
  const [unit, setUnit] = useState<Unit>("mgdl");

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ paddingBottom: 30 }}>
      <BackHeader title="Paramètres" onBack={() => navigate(-1)} />

      <SectionLabel>Langue & Région</SectionLabel>
      <div style={{ margin: "0 16px", background: C.bgS, borderRadius: 14, border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
        {([["fr","🇫🇷 Français"],["ar","🇩🇿 العربية"],["en","🇬🇧 English"]] as [LangKey,string][]).map(([v, l], i) => (
          <div key={v}>
            {i > 0 && <Divider />}
            <motion.div onClick={() => setLang(v)} whileTap={{ scale: 0.98 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>{l}</span>
              {lang === v && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: C.safe, fontSize: 17 }}>✓</motion.span>}
            </motion.div>
          </div>
        ))}
      </div>

      <SectionLabel>Affichage</SectionLabel>
      <div style={{ margin: "0 16px", background: C.bgS, borderRadius: 14, border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
          <div>
            <div style={{ fontSize: 14 }}>Unités glycémie</div>
            <div style={{ fontSize: 12, color: C.t2 }}>Format des valeurs</div>
          </div>
          <div style={{ display: "flex", background: C.bgE, borderRadius: 10, padding: 3 }}>
            {([["mgdl","mg/dL"],["mmol","mmol/L"]] as [Unit,string][]).map(([v, l]) => (
              <motion.button key={v} onClick={() => setUnit(v)} whileTap={{ scale: 0.95 }}
                style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, background: unit === v ? C.brand : "transparent", color: unit === v ? "white" : C.t2, fontWeight: unit === v ? 600 : 400, transition: "all .2s" }}>
                {l}
              </motion.button>
            ))}
          </div>
        </div>
        <Divider />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
          <div>
            <div style={{ fontSize: 14 }}>🌙 Mode Ramadan</div>
            <div style={{ fontSize: 12, color: C.t2 }}>Prédictions adaptées au jeûne</div>
          </div>
          <Toggle on={ramadanMode} onToggle={onRamadanToggle} />
        </div>
      </div>

      <SectionLabel>Seuils d'alerte</SectionLabel>
      <div style={{ margin: "0 16px", background: C.bgS, borderRadius: 14, border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
        {[
          ["Seuil hypoglycémie",      "Alerte en dessous de", "70 mg/dL" ],
          ["Seuil hyperglycémie",     "Alerte au-dessus de",  "180 mg/dL"],
          ["Ratio insuline/glucides", "1U pour X grammes",     "1:10"     ],
        ].map(([l, s, v], i) => (
          <div key={l}>
            {i > 0 && <Divider />}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
              <div>
                <div style={{ fontSize: 14 }}>{l}</div>
                <div style={{ fontSize: 12, color: C.t2 }}>{s}</div>
              </div>
              <span style={{ color: C.t2, fontSize: 13 }}>{v}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Contacts d'urgence</SectionLabel>
      <div style={{ margin: "0 16px", background: C.bgS, borderRadius: 14, border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
        {[
          ["👩 Fatima Mansouri", "Mère · +213 555 123 456"],
          ["👨 Karim Mansouri",  "Frère · +213 555 789 012"],
        ].map(([l, s], i) => (
          <div key={l}>
            {i > 0 && <Divider />}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
              <div>
                <div style={{ fontSize: 14 }}>{l}</div>
                <div style={{ fontSize: 12, color: C.t2 }}>{s}</div>
              </div>
              <ChevronRight size={16} color={C.t2} />
            </div>
          </div>
        ))}
        <Divider />
        <div style={{ padding: "14px 18px", color: C.sky, fontSize: 14, cursor: "pointer" }}>+ Ajouter un contact</div>
      </div>
      <div style={{ height: 20 }} />
    </motion.div>
  );
}
