"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Camera, Layers, BookOpen, User, Shield } from "lucide-react";

import { GLOBAL_CSS } from "./tokens";
import { C } from "./tokens";
import type { Screen } from "./types";

import { DashboardScreen } from "./DashboardScreen";
import { ScanScreen      } from "./ScanScreen";
import { SimulatorScreen } from "./SimulatorScreen";
import { JournalScreen   } from "./JournalScreen";
import { ProfileScreen   } from "./ProfileScreen";
import { SettingsScreen  } from "./SettingsScreen";
import { ReportScreen    } from "./ReportScreen";
import { RamadanScreen   } from "./RamadanScreen";
import { DoctorScreen    } from "./DoctorScreen";
import { EmergencyScreen } from "./EmergencyScreen";

// ─────────────────────────────────────────────────────────────
// BOTTOM NAVIGATION CONFIG
// ─────────────────────────────────────────────────────────────
interface NavItem { id: Screen; label: string; Icon: React.ElementType; }

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Accueil",  Icon: Home     },
  { id: "scan",      label: "Scanner",  Icon: Camera   },
  { id: "simulator", label: "Jumeau",   Icon: Layers   },
  { id: "journal",   label: "Journal",  Icon: BookOpen },
  { id: "profile",   label: "Profil",   Icon: User     },
];

const SUB_SCREENS: Screen[] = ["settings", "report", "ramadan", "doctor", "emergency"];

// ─────────────────────────────────────────────────────────────
// ROOT — GlucoTwin APP
// ─────────────────────────────────────────────────────────────
export default function GlucoTwin() {
  const [screen,      setScreen]      = useState<Screen>("dashboard");
  const [prevScreen,  setPrevScreen]  = useState<Screen>("dashboard");
  const [glucose,     setGlucose]     = useState<number>(142);
  const [ramadanMode, setRamadanMode] = useState<boolean>(true);

  // Inject global CSS once
  const styleInjected = useRef(false);
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const el = document.createElement("style");
    el.setAttribute("data-glucotwin", "1");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => { el.remove(); styleInjected.current = false; };
  }, []);

  // Live glucose simulation (random walk)
  useEffect(() => {
    const t = setInterval(() => {
      setGlucose(v => Math.max(45, Math.min(280, Math.round(v + (Math.random() - 0.45) * 3))));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const navigate = useCallback((s: Screen) => {
    setScreen(prev => { setPrevScreen(prev); return s; });
  }, []);

  const goBack = useCallback(() => setScreen(prevScreen), [prevScreen]);

  const isSub       = SUB_SCREENS.includes(screen);
  const isEmergency = screen === "emergency";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, color: C.t1, height: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 0 120px rgba(0,0,0,.95)" }}>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <AnimatePresence mode="wait">

          {screen === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DashboardScreen onNav={navigate} currentGlucose={glucose} ramadanMode={ramadanMode} />
            </motion.div>
          )}
          {screen === "scan" && (
            <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <ScanScreen onNav={navigate} />
            </motion.div>
          )}
          {screen === "simulator" && (
            <motion.div key="simulator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <SimulatorScreen onNav={navigate} />
            </motion.div>
          )}
          {screen === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <JournalScreen />
            </motion.div>
          )}
          {screen === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <ProfileScreen onNav={navigate} />
            </motion.div>
          )}
          {screen === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <SettingsScreen onBack={goBack} ramadanMode={ramadanMode} onRamadanToggle={() => setRamadanMode(v => !v)} />
            </motion.div>
          )}
          {screen === "report" && (
            <motion.div key="report" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <ReportScreen onBack={goBack} />
            </motion.div>
          )}
          {screen === "ramadan" && (
            <motion.div key="ramadan" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <RamadanScreen onBack={goBack} />
            </motion.div>
          )}
          {screen === "doctor" && (
            <motion.div key="doctor" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <DoctorScreen onBack={goBack} />
            </motion.div>
          )}
          {screen === "emergency" && (
            <motion.div key="emergency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <EmergencyScreen onBack={goBack} currentGlucose={glucose} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Bottom Navigation ── */}
      <AnimatePresence>
        {!isSub && (
          <motion.div key="bottom-nav"
            initial={{ y: 72 }} animate={{ y: 0 }} exit={{ y: 72 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            style={{ height: 72, background: C.bgS, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px", flexShrink: 0, zIndex: 100 }}
          >
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = screen === id;
              return (
                <motion.button key={id} onClick={() => navigate(id)} whileTap={{ scale: 0.9 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 10px", borderRadius: 12, background: "none", color: active ? C.sky : C.t2, minWidth: 54 }}>
                  <motion.div animate={{ background: active ? `${C.sky}16` : "transparent" }} transition={{ duration: 0.2 }} style={{ padding: "3px 6px", borderRadius: 10 }}>
                    <Icon size={22} />
                  </motion.div>
                  <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".3px" }}>{label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emergency FAB ── */}
      <AnimatePresence>
        {!isEmergency && (
          <motion.button key="fab"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("emergency")}
            className="fab-pulse"
            aria-label="Urgence"
            style={{ position: "absolute", bottom: isSub ? 24 : 88, right: 18, width: 52, height: 52, borderRadius: "50%", background: C.dngr, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}
          >
            <Shield size={22} color="white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
