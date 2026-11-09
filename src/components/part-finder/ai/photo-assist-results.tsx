"use client";
import { useState } from "react";
import Link from "next/link";
import { usePhoto } from "../photo-provider";
import { familyById } from "@/config/assistance";
import { getPartType } from "@/config/part-types";
import { confirmFamily, type AssistResult } from "@/lib/ai/contract";
const followUp = {
  "whole-installation": "A view of the whole window or door may help.",
  "opposite-side": "A photo of the opposite side may help.",
  "markings-close-up": "A clear close-up of visible markings may help.",
  "clearer-photo": "Try a sharper, well-lit photo with the whole part in view.",
  none: "You can add another view if you want to clarify the part.",
};
export function PhotoAssistResults({
  result,
  onNotice: setNotice,
}: {
  result: AssistResult;
  onNotice: (message: string) => void;
}) {
  const {
    photo,
    draft,
    setPhoto,
    photoAssist: state,
    setPhotoAssist,
    setDraft,
    setAssistance,
  } = usePhoto();
  const [pendingFamily, setPendingFamily] = useState<string | null>(null);
  const pending = result.candidates.some(
    (candidate) => candidate.familyId === pendingFamily,
  )
    ? familyById(pendingFamily!)
    : null;
  return (
    <div aria-live="polite">
      <h3>
        {result.outcome === "unknown"
          ? "Unknown — more information is needed"
          : "Possible hardware families"}
      </h3>
      <p>
        These are AI suggestions, not verified product matches. Confirm
        measurements and compatibility before ordering.
      </p>
      {result.candidates.map((candidate) => {
        const family = familyById(candidate.familyId)!;
        const requirements = getPartType(family.partType)?.measurements ?? [];
        const entered = draft.measurementsByType[family.partType];
        const missing = requirements.filter(
          (field) =>
            !entered?.values[field.id]?.value.trim() ||
            entered.values[field.id].unknown,
        );
        return (
          <article key={family.id} className="ai-candidate">
            <h4>{family.name}</h4>
            <p>{family.description}</p>
            <ul>
              {candidate.evidence.map((e, i) => (
                <li key={i}>
                  Analysis photo {e.photo}, AI-observed feature: {e.observation}
                </li>
              ))}
            </ul>
            <p>Check next: {family.check}</p>
            <h5>Missing measurements — provisional guidance</h5>
            {requirements.length ? (
              missing.length ? (
                <ul>
                  {missing.map((field) => (
                    <li key={field.id}>{field.label}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  You have entries for these measurement prompts. They still
                  need verification.
                </p>
              )
            ) : (
              <p>
                Choose a more specific part type or use the guide below to
                decide what to measure.
              </p>
            )}
            <p>
              These prompts need manufacturer verification. Measurements are
              optional when unknown; none were inferred from your photos.
            </p>
            <Link
              className="measurement-help"
              href={`/guides/measurements#${family.guide}`}
            >
              Missing measurements and identification help
            </Link>
            <div className="workflow-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={state.rejected.includes(family.id)}
                onClick={() => setPendingFamily(family.id)}
              >
                This Looks Similar
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setPhotoAssist((old) => ({
                    ...old,
                    rejected: [...new Set([...old.rejected, family.id])],
                  }));
                  setAssistance((old) => ({
                    ...old,
                    rejected: [...new Set([...old.rejected, family.id])],
                    similar: old.similar.filter((id) => id !== family.id),
                  }));
                  setPendingFamily(null);
                  setNotice(
                    `${family.name} rejected. Manual details are unchanged.`,
                  );
                }}
              >
                {state.rejected.includes(family.id)
                  ? "Rejected"
                  : "Not This One"}
              </button>
            </div>
          </article>
        );
      })}
      {pending && (
        <div
          className="ai-confirm"
          role="group"
          aria-label="Confirm suggested family"
        >
          <p>
            Use {pending.name}? This will change your selected category and part
            type. Your written details and all saved measurement entries will
            stay intact. Existing answers may differ from this suggestion.
          </p>
          {!photo && state.analyzed[0] && (
            <p>
              Your first selected photo will also be used as your part photo on
              Add Details.
            </p>
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              if (!photo && state.analyzed[0]) setPhoto(state.analyzed[0]);
              setDraft((old) => confirmFamily(old, pending.id));
              setAssistance((old) => ({
                ...old,
                similar: [...new Set([...old.similar, pending.id])],
                rejected: old.rejected.filter((id) => id !== pending.id),
              }));
              setPendingFamily(null);
              setNotice(
                `${pending.name} confirmed. Your manual details are preserved. Continue to Add Details to review.`,
              );
            }}
          >
            Confirm Family Choice
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setPendingFamily(null)}
          >
            Keep Current Choices
          </button>
        </div>
      )}
      {result.markings.length > 0 && (
        <>
          <h4>Uncertain markings — check the original photo</h4>
          <ul>
            {result.markings.map((m, i) => (
              <li key={i}>
                Analysis photo {m.photo}: {m.text} ({m.certainty}; not copied
                into your details)
              </li>
            ))}
          </ul>
        </>
      )}
      <p>{followUp[result.followUp]}</p>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          setPhotoAssist((old) => ({ ...old, result: null, analyzed: [] }));
          setPendingFamily(null);
          setNotice("Marked as Unknown. Your manual answers are unchanged.");
        }}
      >
        Unknown / None of These
      </button>
      {!photo && state.analyzed[0] && (
        <p>
          Opening Add Details will use your first selected photo as your part
          photo, without changing your category or written answers.
        </p>
      )}
      <Link
        className="button button-secondary"
        href="/find-part/details"
        onClick={() => {
          if (!photo && state.analyzed[0]) setPhoto(state.analyzed[0]);
        }}
      >
        Review Identification Details
      </Link>
    </div>
  );
}
