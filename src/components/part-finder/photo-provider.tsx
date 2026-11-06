"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
interface PhotoState {
  photo: File | null;
  setPhoto: (photo: File | null) => void;
}
const PhotoContext = createContext<PhotoState | null>(null);

// Intentionally memory-only: survives client navigation, expires on reload/tab close.
export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photo, setPhoto] = useState<File | null>(null);
  return (
    <PhotoContext.Provider value={{ photo, setPhoto }}>
      {children}
    </PhotoContext.Provider>
  );
}
export function usePhoto() {
  const context = useContext(PhotoContext);
  if (!context) throw new Error("usePhoto must be used within PhotoProvider");
  return context;
}
