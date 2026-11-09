import type { AssistResult } from "@/lib/ai/contract";
export interface PhotoAssistState {
  requested: boolean;
  dismissed: boolean;
  revision: number;
  extraPhotos: File[];
  selected: File[];
  analyzed: File[];
  result: AssistResult | null;
  rejected: string[];
}
export const emptyPhotoAssist = (): PhotoAssistState => ({
  requested: false,
  dismissed: false,
  revision: 0,
  extraPhotos: [],
  selected: [],
  analyzed: [],
  result: null,
  rejected: [],
});
