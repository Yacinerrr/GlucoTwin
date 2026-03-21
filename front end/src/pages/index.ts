// ─────────────────────────────────────────────────────────────
// BARREL EXPORTS
// ─────────────────────────────────────────────────────────────

export { default } from "./GlucoTwin";

// Screens
export { DashboardScreen } from "./DashboardScreen";
export { ScanScreen      } from "./ScanScreen";
export { SimulatorScreen } from "./SimulatorScreen";
export { JournalScreen   } from "./JournalScreen";
export { ProfileScreen   } from "./ProfileScreen";
export { SettingsScreen  } from "./SettingsScreen";
export { ReportScreen    } from "./ReportScreen";
export { RamadanScreen   } from "./RamadanScreen";
export { DoctorScreen    } from "./DoctorScreen";
export { EmergencyScreen } from "./EmergencyScreen";

// Shared
export { C, GLOBAL_CSS    } from "./tokens";
export * from "./types";
export * from "./helpers";
export * from "./data";
export { Divider, SectionLabel, BackHeader, StatCard, Toggle } from "./ui";
