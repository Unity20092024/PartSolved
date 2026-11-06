"use client";
import Link from "next/link";
import {
  Camera,
  PanelsTopLeft,
  Wrench,
  Images,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { usePhoto } from "../photo-provider";
import type { AssistanceView } from "@/types/assistance";
export function RecoveryHub() {
  const { setAssistance, guided } = usePhoto();
  const actions: {
    view: AssistanceView;
    title: string;
    copy: string;
    icon: typeof Camera;
  }[] = [
    {
      view: "photos",
      title: "Show What's Broken",
      copy: "Take a photo of the window or door, or the area that isn't working.",
      icon: Camera,
    },
    {
      view: "location",
      title: "Tap Where the Problem Is",
      copy: "Use a simple picture to point out the area giving you trouble.",
      icon: PanelsTopLeft,
    },
    {
      view: "symptom",
      title: "Tell Us What's Happening",
      copy: "Choose an everyday description: won't open, won't lock, or hard to slide.",
      icon: Wrench,
    },
    {
      view: "common",
      title: "Show Me Common Parts",
      copy: "See examples and simple descriptions of common hardware families.",
      icon: Images,
    },
  ];
  return (
    <section className="assist-hub" aria-labelledby="assist-recovery-title">
      <h2 id="assist-recovery-title" tabIndex={-1}>
        Still Not Sure? We Can Help You Figure It Out.
      </h2>
      <p>
        You don&apos;t need to know the part name or measurements. Show us
        what&apos;s wrong, or answer a few simple questions.
      </p>
      <div className="assist-hub-actions">
        {actions.map(({ view, title, copy, icon: Icon }) => (
          <button
            key={view}
            className="assist-hub-action"
            type="button"
            onClick={() =>
              setAssistance((previous) => ({
                ...previous,
                view,
                location: previous.location || guided.location,
              }))
            }
          >
            <span className="assist-action-icon">
              <Icon size={34} aria-hidden="true" />
            </span>
            <span>
              <strong>{title}</strong>
              <span>{copy}</span>
            </span>
            <span className="assist-circle">
              <ArrowRight size={23} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <Link href="/guides" className="measurement-help">
        <BookOpen size={23} aria-hidden="true" /> View Identification Guides
      </Link>
    </section>
  );
}
