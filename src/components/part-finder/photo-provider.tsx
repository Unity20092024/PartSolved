"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { IntakeDraft, GuidedAnswers } from "@/types/intake";
import { emptyDraft, emptyGuided } from "@/lib/intake";
import { emptyAssistance, type AssistanceState } from "@/types/assistance";
import {
  emptyPhotoAssist,
  type PhotoAssistState,
} from "@/types/ai-photo-assist";
interface PhotoState {
  photoAssist: PhotoAssistState;
  setPhotoAssist: Dispatch<SetStateAction<PhotoAssistState>>;
  assistance: AssistanceState;
  setAssistance: Dispatch<SetStateAction<AssistanceState>>;
  photo: File | null;
  photoBusy: boolean;
  setPhotoBusy: Dispatch<SetStateAction<boolean>>;
  draft: IntakeDraft;
  setDraft: Dispatch<SetStateAction<IntakeDraft>>;
  guided: GuidedAnswers;
  setGuided: Dispatch<SetStateAction<GuidedAnswers>>;
  setPhoto: (photo: File | null) => void;
}
const PhotoContext = createContext<PhotoState | null>(null);

// Intentionally memory-only: survives client navigation, expires on reload/tab close.
export function PhotoProvider({ children }: { children: ReactNode }) {
  const [assistance, setAssistance] =
    useState<AssistanceState>(emptyAssistance);
  const [photo, setPhotoState] = useState<File | null>(null);
  const [photoAssist, setPhotoAssist] =
    useState<PhotoAssistState>(emptyPhotoAssist);
  function setPhoto(file: File | null) {
    setPhotoState(file);
    setPhotoAssist((old) => ({
      ...old,
      revision: old.revision + 1,
      selected: old.selected.filter((item) => item !== photo),
      analyzed: [],
      result: null,
    }));
  }
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [guided, setGuided] = useState<GuidedAnswers>(emptyGuided);
  return (
    <PhotoContext.Provider
      value={{
        photoAssist,
        setPhotoAssist,
        assistance,
        setAssistance,
        photo,
        setPhoto,
        photoBusy,
        setPhotoBusy,
        draft,
        setDraft,
        guided,
        setGuided,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
}
export function usePhoto() {
  const context = useContext(PhotoContext);
  if (!context) throw new Error("usePhoto must be used within PhotoProvider");
  return context;
}
