import type { HardwareCategory, MeasurementGuide } from "./intake";
export type AssistanceView =
  | "questions"
  | "hub"
  | "location"
  | "area"
  | "symptom"
  | "stuck"
  | "photos"
  | "common"
  | "results"
  | "summary";
export interface SupportingPhoto {
  id: string;
  file: File;
  purpose: string;
  note: string;
  point?: { x: number; y: number };
}
export interface AssistanceState {
  view: AssistanceView;
  location: string;
  area: string;
  symptom: string;
  stuck: string;
  description: string;
  similar: string[];
  rejected: string[];
  photos: SupportingPhoto[];
}
export interface PartFamily {
  id: string;
  name: string;
  category: HardwareCategory;
  partType: string;
  description: string;
  problem: string;
  check: string;
  guide: MeasurementGuide;
  image: string;
}
export interface FamilySuggestion {
  family: PartFamily;
  reason: string;
}
export const emptyAssistance = (): AssistanceState => ({
  view: "questions",
  location: "",
  area: "",
  symptom: "",
  stuck: "",
  description: "",
  similar: [],
  rejected: [],
  photos: [],
});
