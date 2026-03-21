// ─────────────────────────────────────────────────────────────
// ZONE HELPERS
// ─────────────────────────────────────────────────────────────

import { C } from "./tokens";
import type { Zone, Trend, GlucosePoint } from "./types";

export const getZone = (v: number): Zone =>
  v < 54 || v > 250 ? "danger" : v < 70 || v > 180 ? "attention" : "safe";

export const zoneColor = (z: Zone): string =>
  z === "safe" ? C.safe : z === "attention" ? C.attn : C.dngr;

export const zoneBg = (z: Zone): string =>
  z === "safe" ? C.safeD : z === "attention" ? C.attnD : C.dngrD;

export const zoneLabel = (z: Zone): string =>
  z === "safe" ? "Zone sûre" : z === "attention" ? "Zone attention" : "DANGER";

export const trendArrows: Record<Trend, string> = { rising: "↑", falling: "↓", stable: "→" };

export const TREND_LABEL: Record<Trend, string> = {
  rising: "En hausse", falling: "En baisse", stable: "Stable",
};

// ─────────────────────────────────────────────────────────────
// CHART UTILITIES
// ─────────────────────────────────────────────────────────────

export interface ChartPoint { x: number; y: number; }

export function buildPoints(
  data: GlucosePoint[],
  W: number, H: number,
  pad = 10,
  minOverride?: number,
  maxOverride?: number,
): ChartPoint[] {
  if (data.length < 2) return [];
  const vals = data.map((d) => d.value);
  const mn = minOverride ?? Math.min(...vals) - 15;
  const mx = maxOverride ?? Math.max(...vals) + 15;
  const rng = mx - mn || 1;
  return data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (d.value - mn) / rng) * (H - pad * 2),
  }));
}

export const toLinePath = (pts: ChartPoint[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

export const toAreaPath = (pts: ChartPoint[], H: number): string =>
  `${toLinePath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

export const valToY = (v: number, mn: number, mx: number, H: number, pad = 10): number =>
  pad + (1 - (v - mn) / (mx - mn || 1)) * (H - pad * 2);
