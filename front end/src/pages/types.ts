// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type Zone         = "safe" | "attention" | "danger";
export type Trend        = "rising" | "falling" | "stable";
export type Screen       =
  | "dashboard" | "scan" | "simulator" | "journal" | "profile"
  | "settings"  | "report" | "ramadan"  | "doctor"  | "emergency";
export type ActivityLevel = 0 | 1 | 2 | 3;
export type LangKey      = "fr" | "ar" | "en";
export type Unit         = "mgdl" | "mmol";

export interface GlucosePoint { time: string; value: number; }

export interface JournalEntry {
  date: string; time: string;
  type: "glucose" | "meal" | "insulin" | "alert" | "prediction";
  zone: Zone; title: string; value: string; comment: string;
}

export interface Patient {
  initials: string; name: string; type: string; glucose: number;
  zone: Zone; last: string; sparkline: number[]; critical?: boolean;
}
