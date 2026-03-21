// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────

import type { GlucosePoint, JournalEntry, Patient } from "./types";

export const MOCK_HISTORY: GlucosePoint[] = [
  { time: "10:00", value: 95  }, { time: "10:15", value: 102 },
  { time: "10:30", value: 118 }, { time: "10:45", value: 132 },
  { time: "11:00", value: 145 }, { time: "11:15", value: 138 },
  { time: "11:30", value: 128 }, { time: "11:45", value: 119 },
  { time: "12:00", value: 112 }, { time: "12:15", value: 108 },
  { time: "12:30", value: 105 }, { time: "12:45", value: 110 },
  { time: "13:00", value: 115 }, { time: "13:15", value: 120 },
  { time: "13:30", value: 118 }, { time: "13:45", value: 112 },
  { time: "14:00", value: 120 }, { time: "14:15", value: 128 },
  { time: "14:30", value: 138 }, { time: "14:45", value: 142 },
];

export const MOCK_PREDICTION: GlucosePoint[] = [
  { time: "+1h", value: 148 }, { time: "+2h", value: 162 },
  { time: "+3h", value: 155 }, { time: "+4h", value: 142 },
  { time: "+5h", value: 130 }, { time: "+6h", value: 118 },
  { time: "+7h", value: 110 }, { time: "+8h", value: 108 },
];

export const JOURNAL_DATA: JournalEntry[] = [
  { date: "Aujourd'hui", time: "14:22", type: "glucose", zone: "safe",
    title: "Lecture glycémique", value: "142 mg/dL · Zone sûre →",
    comment: "Glycémie stable, dans la zone cible" },
  { date: "Aujourd'hui", time: "12:30", type: "meal", zone: "attention",
    title: "Repas · Déjeuner", value: "Couscous aux légumes · 85g glucides",
    comment: "Pic attendu dans 45min · surveiller" },
  { date: "Aujourd'hui", time: "12:25", type: "insulin", zone: "safe",
    title: "Insuline prandiale", value: "Novorapid · 8 unités",
    comment: "Correctement ajustée selon le repas" },
  { date: "Aujourd'hui", time: "10:15", type: "alert", zone: "danger",
    title: "Alerte · Hyperglycémie", value: "218 mg/dL · Pic post-prandial",
    comment: "Dépassement seuil 180 mg/dL · 28min" },
  { date: "Hier", time: "20:30", type: "glucose", zone: "safe",
    title: "Lecture glycémique", value: "118 mg/dL · Zone sûre ↓",
    comment: "Excellente journée — TIR 89%" },
  { date: "Hier", time: "15:45", type: "alert", zone: "attention",
    title: "Alerte · Hypoglycémie", value: "68 mg/dL · Tendance descendante ↓",
    comment: "Prise de 15g glucides rapides recommandée" },
];

export const PATIENTS: Patient[] = [
  { initials: "MB", name: "Mohamed Benali",  type: "DT2", glucose: 287,
    zone: "danger",    last: "il y a 2 min",  sparkline: [180,195,215,240,262,278,287], critical: true },
  { initials: "AM", name: "Amina Mansouri",  type: "DT1", glucose: 142,
    zone: "safe",      last: "il y a 3 min",  sparkline: [162,155,148,142,138,140,142] },
  { initials: "KD", name: "Karima Djebbar",  type: "DT2", glucose: 192,
    zone: "attention", last: "il y a 15 min", sparkline: [140,155,170,183,190,188,192] },
  { initials: "YB", name: "Youcef Boukhari", type: "DT1", glucose: 118,
    zone: "safe",      last: "il y a 8 min",  sparkline: [132,126,122,118,115,118,118] },
  { initials: "SM", name: "Souad Meziane",   type: "DT2", glucose: 135,
    zone: "safe",      last: "il y a 1h",     sparkline: [128,130,132,135,136,134,135] },
];

export const HEAT_DATA = [
  { d: "Lu", v: 135, z: "safe"      as const },
  { d: "Ma", v: 128, z: "safe"      as const },
  { d: "Me", v: 195, z: "attention" as const },
  { d: "Je", v: 141, z: "safe"      as const },
  { d: "Ve", v: 132, z: "safe"      as const },
  { d: "Sa", v: 215, z: "danger"    as const },
  { d: "Di", v: 142, z: "safe"      as const },
];

export const PRAYER_TIMELINE = [
  { icon: "🌅", label: "Fajr – Début du jeûne",   time: "04:52", note: "Glycémie actuelle : 112 mg/dL ✓",             color: "#38BDF8" },
  { icon: "⚠️", label: "Seuil d'alerte Suhur",    time: "05:30", note: "Dernier moment recommandé pour manger",        color: "#E07B20" },
  { icon: "☀️", label: "Dhuhr",                    time: "12:18", note: "Prédiction : 95 mg/dL",                       color: "#7B91AD" },
  { icon: "🌤",  label: "Asr",                      time: "15:30", note: "Prédiction : 82 mg/dL",                       color: "#7B91AD" },
  { icon: "🌙", label: "Maghrib – Iftar",           time: "18:47", note: "Recommandation : commencer par 30g glucides", color: "#0F9E78" },
] as const;
