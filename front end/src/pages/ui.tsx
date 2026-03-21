"use client";

// ─────────────────────────────────────────────────────────────
// SHARED UI ATOMS
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { C } from "./tokens";

export function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "2px 0" }} />;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "14px 18px 6px", fontSize: 10, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "1.2px", color: C.t2,
    }}>
      {children}
    </div>
  );
}

interface BackHeaderProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export function BackHeader({ title, onBack, right }: BackHeaderProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)",
      background: C.bg, position: "sticky", top: 0, zIndex: 20,
    }}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        style={{ background: "none", color: C.sky, display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: 0 }}
      >
        <ChevronLeft size={18} /> Retour
      </motion.button>
      <span className="syne" style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
      <div style={{ minWidth: 60, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

interface StatCardProps { icon: React.ReactNode; label: string; value: string; color?: string; }

export function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.bgS, borderRadius: 12, padding: "14px 12px",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", gap: 5,
      }}
    >
      <span style={{ fontSize: 10, color: C.t2, textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 500 }}>
        {label}
      </span>
      <span className="syne" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: color || C.t1 }}>
        {value}
      </span>
      {icon}
    </motion.div>
  );
}

interface ToggleProps { on: boolean; onToggle: () => void; }

export function Toggle({ on, onToggle }: ToggleProps) {
  return (
    <motion.div
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? C.safe : C.bgH,
        position: "relative", cursor: "pointer",
        border: "1px solid rgba(255,255,255,.1)",
      }}
      animate={{ background: on ? C.safe : C.bgH }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        animate={{ left: on ? 18 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute", top: 3, width: 18, height: 18,
          borderRadius: "50%", background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,.3)",
        }}
      />
    </motion.div>
  );
}
