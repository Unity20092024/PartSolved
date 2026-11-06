export type Unit = "in" | "mm";
export type HardwareCategory =
  | "window-hardware"
  | "window-parts"
  | "door-hardware"
  | "door-parts"
  | "not-sure";
export type MeasurementGuide =
  | "screw-spacing"
  | "overall-size"
  | "roller-diameter"
  | "roller-housing"
  | "window-balances"
  | "balance-fittings"
  | "lock-backset"
  | "orientation";
export interface MeasurementRequirement {
  id: string;
  label: string;
  help: string;
  guide: MeasurementGuide;
}
export interface PartTypeDefinition {
  id: string;
  label: string;
  category: HardwareCategory;
  description: string;
  locations: string[];
  purposes: string[];
  orientation: boolean;
  measurements: MeasurementRequirement[];
}
export interface MeasurementAnswer {
  value: string;
  unknown: boolean;
}
export interface MeasurementGroup {
  unit: Unit;
  values: Record<string, MeasurementAnswer>;
  notes: string;
}
export interface IntakeDraft {
  source: "photo" | "guided";
  category: HardwareCategory | "";
  typesByCategory: Record<string, string>;
  measurementsByType: Record<string, MeasurementGroup>;
  manufacturer: string;
  markings: string;
  guidedMarkingsApplied: string;
  finish: string;
  orientation: "left" | "right" | "not-sure";
  problem: string;
}
export interface GuidedAnswers {
  step: number;
  location: string;
  purpose: string;
  appearance: string;
  information: "" | "measurements" | "markings" | "both" | "not-sure";
  measurementNotes: string;
  markings: string;
  completed: boolean;
}
export interface IdentificationIntake {
  schemaVersion: 1;
  category: HardwareCategory;
  partType: string;
  measurements: {
    id: string;
    value: number | null;
    enteredValue: string;
    unit: Unit;
    status: "provided" | "unknown" | "missing";
  }[];
  measurementNotes: string;
  manufacturer: string;
  markings: string;
  finish: string;
  orientation: "left" | "right" | "not-sure";
  problem: string;
  guidedAnswers?: Omit<GuidedAnswers, "step" | "completed">;
}
