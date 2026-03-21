"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "./tokens";
import { zoneColor } from "./helpers";
import { JOURNAL_DATA } from "./data";
import type { JournalEntry } from "./types";

type JournalFilter = "all" | "alert" | "meal" | "insulin" | "glucose";

const TYPE_ICON: Record<JournalEntry["type"], string> = {
  glucose: "🔵", meal: "🍽", insulin: "💉", alert: "🚨", prediction: "⚡",
};

export function JournalScreen() {
  const [filter, setFilter] = useState<JournalFilter>("all");

  const filtered = JOURNAL_DATA.filter(e => filter === "all" || e.type === filter);

  const grouped: Record<string, JournalEntry[]> = {};
  filtered.forEach(e => { (grouped[e.date] = grouped[e.date] || []).push(e); });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <span className="syne" style={{ fontWeight: 700, fontSize: 18 }}>Journal</span>
        <span style={{ fontSize: 12, color: C.t2 }}>73 événements</span>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px", overflowX: "auto" }}>
        {([
          ["all",     "Tous"],
          ["alert",   "🚨 Alertes"],
          ["meal",    "🍽 Repas"],
          ["insulin", "💉 Insuline"],
          ["glucose", "🔵 Glycémie"],
        ] as [JournalFilter, string][]).map(([v, l]) => (
          <motion.button key={v} onClick={() => setFilter(v)} whileTap={{ scale: 0.95 }}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: filter === v ? `${C.sky}18` : C.bgS,
              border: filter === v ? `1px solid ${C.sky}50` : "1px solid rgba(255,255,255,.06)",
              color: filter === v ? C.sky : C.t2, transition: "all .2s",
            }}>
            {l}
          </motion.button>
        ))}
      </div>

      {/* Feed */}
      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <div style={{ padding: "6px 18px", fontSize: 10, color: C.t2, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, background: C.bg, position: "sticky", top: 0, zIndex: 5 }}>
            {date} · {date === "Aujourd'hui" ? "21 Mars" : "20 Mars"}
          </div>
          <AnimatePresence>
            {entries.map((e, i) => (
              <motion.div key={`${e.time}-${i}`}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                style={{ display: "flex", gap: 12, padding: "13px 16px", borderLeft: `3px solid ${zoneColor(e.zone)}`, borderBottom: "1px solid rgba(255,255,255,.03)" }}
              >
                <div style={{ width: 38, height: 38, background: C.bgS, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {TYPE_ICON[e.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.t2, marginBottom: 2 }}>{e.title}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{e.value}</div>
                  <div style={{ fontSize: 12, color: C.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.comment}</div>
                </div>
                <div style={{ fontSize: 11, color: C.t2, flexShrink: 0 }}>{e.time}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </motion.div>
  );
}
