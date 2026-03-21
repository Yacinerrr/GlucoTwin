export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export interface GlucoseReading {
  id: string
  value: number
  unit: GlucoseUnit
  timestamp: string
}

export interface InsulinDose {
  id: string
  type: string
  units: number
  injectedAt: string
}

export interface Meal {
  id: string
  photoUrl?: string
  carbsEstimated: number
  safetyScore: number
  loggedAt: string
}

export interface GlucosePrediction {
  horizon: '1h' | '2h' | '4h' | '8h'
  points: { time: string; value: number }[]
  hypoRisk: number
}

export type RamadanMode = 'off' | 'active'