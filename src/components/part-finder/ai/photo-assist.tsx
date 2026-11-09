"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePhoto } from "../photo-provider";
import { PhotoPreview } from "../photo-preview";
import { validateAnalysis } from "@/lib/ai/contract";
import { compressAnalysisPhoto } from "@/lib/ai/client-images";
import {
  validatePhotoFile,
  validatePhotoDecoding,
} from "@/lib/photo-validation";
import "./photo-assist.css";
import { PhotoAssistResults } from "./photo-assist-results";

export function PhotoAssist() {
  const {
    photo,
    draft,
    assistance,
    photoAssist: state,
    setPhotoAssist,
  } = usePhoto();
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const pool = [
    ...new Set([
      ...(photo ? [photo] : []),
      ...assistance.photos.map((p) => p.file),
      ...state.extraPhotos,
    ]),
  ];
  const selected = state.selected.filter((file) => pool.includes(file));
  const selectedRef = useRef({ selected, revision: state.revision });
  useEffect(() => {
    selectedRef.current = { selected, revision: state.revision };
  });
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  const matches =
    selected.length > 0 &&
    selected.length === state.analyzed.length &&
    selected.every((file, index) => state.analyzed[index] === file);
  const result = matches ? state.result : null;
  function choose(file: File, checked: boolean) {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setConsent(false);
    setError("");
    setPhotoAssist((old) => ({
      ...old,
      selected: checked
        ? [...selected, file].slice(0, 3)
        : selected.filter((f) => f !== file),
      result: null,
      analyzed: [],
    }));
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    try {
      const additions = [...files];
      if (state.extraPhotos.length + additions.length > 3)
        throw new Error(
          "Keep at most three Photo Assist photos. Remove one before adding another.",
        );
      for (const file of additions) {
        const issue = validatePhotoFile(file);
        if (issue) throw new Error(issue);
        await validatePhotoDecoding(file);
      }
      setPhotoAssist((old) => ({
        ...old,
        extraPhotos: [...old.extraPhotos, ...additions],
      }));
      setNotice("Photos added locally. Select up to three to analyze.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "That photo could not be opened.",
      );
    }
  }
  async function analyze() {
    if (!consent || !selected.length || busy) return;
    const current = [...selected],
      revision = state.revision,
      version = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setNotice("");
    setPhotoAssist((old) => ({ ...old, result: null, analyzed: [] }));
    try {
      const body = new FormData();
      for (const file of current)
        body.append(
          "photos",
          await compressAnalysisPhoto(file),
          "analysis.jpg",
        );
      if (
        revision !== selectedRef.current.revision ||
        version !== generation.current ||
        abort.signal.aborted
      )
        return;
      setPhotoAssist((old) => ({ ...old, requested: true }));
      const response = await fetch("/api/hardware/analyze", {
        method: "POST",
        body,
        credentials: "same-origin",
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(45_000)]),
        headers: {
          "idempotency-key": crypto.randomUUID(),
          "x-photo-consent": "openai-v1",
        },
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Photo Assist is unavailable. Continue with the manual finder.",
        );
      const analysis = validateAnalysis(payload.analysis, current.length);
      const latest = selectedRef.current.selected;
      if (
        revision !== selectedRef.current.revision ||
        version !== generation.current ||
        latest.length !== current.length ||
        !current.every((file, index) => file === latest[index])
      )
        return;
      setPhotoAssist((old) => ({
        ...old,
        result: analysis,
        analyzed: current,
        rejected: [],
      }));
      setNotice(
        "Analysis ready. Review the evidence and confirm a family before changing your answers.",
      );
    } catch (failure) {
      if (version === generation.current && !abort.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Analysis did not finish. You can continue without AI.",
        );
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  if (state.dismissed)
    return (
      <div className="intake-card">
        <p>
          Photo Assist skipped. Continue with the existing Guided Finder
          questions and assistance below.
        </p>
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            setPhotoAssist((old) => ({ ...old, dismissed: false }))
          }
        >
          Show Optional Photo Assist
        </button>
      </div>
    );
  return (
    <section
      className="intake-card photo-assist"
      aria-labelledby="photo-assist-title"
    >
      <h2 id="photo-assist-title">
        AI Photo Assist{" "}
        <span className="field-hint">Private development review</span>
      </h2>
      <p>
        Suggest possible hardware families from one photo and up to two optional
        follow-up photos. Accuracy has not been established. No exact
        replacement or compatibility is verified.
      </p>
      <p>
        Your original photos and answers stay in this tab&apos;s memory and may
        disappear on refresh.
      </p>
      <Link className="measurement-help" href="/find-part/ai-review">
        Reviewer usage and session controls
      </Link>
      <p className="field-hint">
        Evidence refers to the analysis photo numbers shown on your selected
        photos.
      </p>
      <div className="ai-photo-options">
        {pool.map((file, index) => (
          <div key={index} className="ai-photo-option">
            <PhotoPreview photo={file} />
            {selected.includes(file) && (
              <p className="field-hint">
                <strong>Analysis photo {selected.indexOf(file) + 1}</strong>
              </p>
            )}
            <label>
              <input
                type="checkbox"
                checked={selected.includes(file)}
                disabled={
                  busy || (!selected.includes(file) && selected.length >= 3)
                }
                onChange={(e) => choose(file, e.target.checked)}
              />
              Select photo {index + 1} for analysis
            </label>
            {state.extraPhotos.includes(file) && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  choose(file, false);
                  setPhotoAssist((old) => ({
                    ...old,
                    extraPhotos: old.extraPhotos.filter((p) => p !== file),
                  }));
                }}
              >
                Remove Photo Assist photo {index + 1}
              </button>
            )}
          </div>
        ))}
      </div>
      <label className="ai-file-label">
        Add a photo or follow-up view
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(e) => {
            void addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p>
        Need a different angle? You can use your device&apos;s existing
        camera/upload controls. Analysis is always optional.
      </p>
      <div className="ai-privacy">
        <p>
          Only the photos you select here will be sent through PartSolved to
          OpenAI. PartSolved does not permanently save these photos. OpenAI may
          retain API content for abuse monitoring, normally up to 30 days, with
          policy exceptions. API data is not used for training by default. This
          is not a zero-retention service.
        </p>
        <a
          href="https://developers.openai.com/api/docs/guides/your-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read OpenAI&apos;s data controls
        </a>
        <label>
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I agree to send these {selected.length} selected photos to OpenAI for
          this analysis.
        </label>
      </div>
      <div className="workflow-actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!consent || !selected.length || busy}
          onClick={() => void analyze()}
        >
          {busy ? "Analyzing selected photos…" : "Analyze Photo"}
        </button>
        {busy && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              generation.current++;
              controller.current?.abort();
              setBusy(false);
              setNotice(
                "Stopped waiting. A submitted request may still count toward the allowance. Your answers are unchanged.",
              );
            }}
          >
            Cancel Analysis
          </button>
        )}
        {photo || draft.source === "guided" ? (
          <Link className="button button-secondary" href="/find-part/details">
            Continue Without AI
          </Link>
        ) : (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              generation.current++;
              controller.current?.abort();
              setBusy(false);
              setPhotoAssist((old) => ({ ...old, dismissed: true }));
            }}
          >
            Continue Without AI
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {state.result && !matches && (
        <p role="status">
          The selected photos changed. Analyze the current selection before
          accepting a suggestion.
        </p>
      )}
      {result && <PhotoAssistResults result={result} onNotice={setNotice} />}
    </section>
  );
}
