"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePhoto } from "./photo-provider";
import { WorkflowShell } from "./workflow-shell";
import { PhotoRecovery } from "./photo-recovery";
import {
  finderInput,
  nextMeasurement,
  type FinderCandidate,
  type FinderResponse,
} from "@/lib/finder-catalog/contract";
import { getPartType } from "@/config/part-types";
import {
  emptyDraft,
  emptyGuided,
  emptyMeasurements,
  convertGroup,
  parseMeasurement,
} from "@/lib/intake";
import { emptyAssistance } from "@/types/assistance";
import { emptyPhotoAssist } from "@/types/ai-photo-assist";
import { MeasurementDiagram } from "@/components/ui/measurement-diagram";
import type { MeasurementRequirement } from "@/types/intake";
function MeasurementQuestion({ prompt }: { prompt: MeasurementRequirement }) {
  const { draft, setDraft } = usePhoto(),
    type = draft.typesByCategory[draft.category] || "",
    group = draft.measurementsByType[type] || emptyMeasurements();
  const [value, setValue] = useState(group.values[prompt.id]?.value || ""),
    [unit, setUnit] = useState(group.unit),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState("");
  const kind =
    prompt.guide === "screw-spacing"
      ? "spacing"
      : prompt.guide === "roller-diameter"
        ? "roller"
        : prompt.guide === "window-balances" ||
            prompt.guide === "balance-fittings"
          ? "balance"
          : prompt.guide === "lock-backset"
            ? "backset"
            : "size";
  return (
    <details className="finder-optional catalog-measure-question">
      <summary>Compare {prompt.label.toLowerCase()} (optional)</summary>
      <p>
        This catalog record includes this measurement. It may help you compare
        candidates; it is not a required step or a fit rule.
      </p>
      <p>{prompt.help}</p>
      <MeasurementDiagram kind={kind} />
      <Link
        className="measurement-help"
        href={`/guides/measurements#${prompt.guide}`}
      >
        Measurement and identification guide
      </Link>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!unknown && parseMeasurement(value, unit) === null) {
            setError("Enter a positive measurement, or select I Don't Know.");
            return;
          }
          const converted = convertGroup(group, unit);
          if (!converted) {
            setError(
              "Correct or clear an earlier invalid measurement in your details before changing units.",
            );
            return;
          }
          setDraft((d) => ({
            ...d,
            measurementsByType: {
              ...d.measurementsByType,
              [type]: {
                ...converted,
                values: {
                  ...converted.values,
                  [prompt.id]: { value: value.trim(), unknown },
                },
              },
            },
          }));
          setError("");
        }}
      >
        <label className="field-label" htmlFor="candidate-measure">
          {prompt.label}
        </label>
        <input
          id="candidate-measure"
          value={value}
          maxLength={30}
          disabled={unknown}
          inputMode={unit === "mm" ? "decimal" : "text"}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "candidate-measure-error" : undefined}
          placeholder="Your measurement, if known"
        />
        <label className="field-label" htmlFor="candidate-unit">
          Units
        </label>
        <select
          id="candidate-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as "in" | "mm")}
        >
          <option value="in">Inches</option>
          <option value="mm">Millimeters</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={unknown}
            onChange={(e) => setUnknown(e.target.checked)}
          />
          I Don&apos;t Know
        </label>
        {error && (
          <p id="candidate-measure-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-secondary" type="submit">
          Update candidates
        </button>
      </form>
    </details>
  );
}
function CandidateCard({ candidate }: { candidate: FinderCandidate }) {
  const h = candidate.hit,
    image = h.media[0],
    mpns = h.numbers.filter(
      (n) => n.kind === "manufacturer" && n.source_id && n.verified_at,
    );
  return (
    <article className="intake-card finder-candidate">
      {image ? (
        <Image
          src={`/api/catalog/media/${image.id}`}
          width={image.width}
          height={image.height}
          alt={image.alt}
          unoptimized
          className="finder-candidate-image"
        />
      ) : (
        <p className="finder-no-image">
          No authorized product photograph available
        </p>
      )}
      {image?.attribution && <p className="field-hint">{image.attribution}</p>}
      <p className="finder-candidate-label">{candidate.label}</p>
      <h2>{h.title}</h2>
      <dl className="review-list">
        <div>
          <dt>Manufacturer</dt>
          <dd>{h.manufacturer_name}</dd>
        </div>
        <div>
          <dt>Verified manufacturer part number</dt>
          <dd>
            {mpns.length ? mpns.map((n) => n.value).join(", ") : "Not recorded"}
          </dd>
        </div>
      </dl>
      <h3>Why this appeared</h3>
      <ul>
        {candidate.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <section>
        <h3>What still needs verification</h3>
        <ul>
          {candidate.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </section>
      <p className="field-hint">
        A number match is not guaranteed fit. No checkout or supplier
        fulfillment is active here.
      </p>
      <Link
        className="button button-secondary"
        href={`/catalog/${h.slug}?variant=${h.variant_id}`}
      >
        View Part Details
      </Link>
    </article>
  );
}
export function CatalogResults() {
  const {
      draft,
      photo,
      setDraft,
      setPhoto,
      setGuided,
      setAssistance,
      setPhotoAssist,
    } = usePhoto(),
    router = useRouter();
  const input = useMemo(() => {
    try {
      return finderInput(draft);
    } catch {
      return null;
    }
  }, [draft]);
  const base = input ? JSON.stringify({ ...input, page: 0 }) : "";
  const [paging, setPaging] = useState({ base: "", page: 0 }),
    [retry, setRetry] = useState(0);
  const page = paging.base === base ? paging.page : 0,
    body = input ? JSON.stringify({ ...input, page }) : "";
  const allowed = !!input && (!!photo || draft.source === "guided"),
    key = allowed ? `${body}:${retry}` : "";
  const [state, setState] = useState<{
    key: string;
    base: string;
    data: FinderResponse | null;
    error: string;
  }>({ key: "", base: "", data: null, error: "" });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    void Promise.resolve().then(async () => {
      if (!active) return;
      setDraft((d) =>
        d.catalogSearchRequested ? d : { ...d, catalogSearchRequested: true },
      );
      try {
        const response = await fetch("/api/finder/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          // Keep first-party hosting protection cookies; the API always queries as anon.
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Catalog search could not be completed.",
          );
        if (active)
          setState((previous) => {
            const older =
              page > 0 && previous.base === base && previous.data
                ? previous.data.candidates
                : [];
            const candidates = [
              ...new Map(
                [...older, ...(data as FinderResponse).candidates].map((c) => [
                  c.hit.product_id,
                  c,
                ]),
              ).values(),
            ];
            return { key, base, data: { ...data, candidates }, error: "" };
          });
      } catch (error) {
        if (active)
          setState((previous) => ({
            key,
            base,
            data: previous.base === base ? previous.data : null,
            error: controller.signal.aborted
              ? "The search timed out. Your answers are kept; try again."
              : error instanceof Error
                ? error.message
                : "Search failed. Try again.",
          }));
      } finally {
        clearTimeout(timer);
      }
    });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, body, base, page, setDraft]);
  const data = state.base === base ? state.data : null,
    busy = allowed && state.key !== key,
    error = state.base === base ? state.error : "";
  const prompt =
    input && data ? nextMeasurement(data.candidates, input) : undefined;
  const guide =
    getPartType(input?.partType || "")?.measurements[0]?.guide ||
    "overall-size";
  const family = data?.candidates[0]?.hit.family_id;
  const browse = family ? `/catalog?family=${family}` : "/catalog";
  function reset() {
    if (
      !window.confirm(
        "Find another part? This clears this tab’s current photos and answers.",
      )
    )
      return;
    setPhoto(null);
    setDraft(emptyDraft());
    setGuided(emptyGuided());
    setAssistance(emptyAssistance());
    setPhotoAssist(emptyPhotoAssist());
    router.push("/#photo-upload");
  }
  return (
    <WorkflowShell
      title="Catalog Results"
      description="Based on your written details, not photo contents. Confirm measurements and compatibility before choosing a replacement."
      step={2}
      completedSteps={[...(photo ? [0] : []), ...(input ? [1] : [])]}
      optionalPhoto={draft.source === "guided"}
      back="/find-part/review"
      catalogSearch
    >
      {!photo && draft.source === "photo" ? (
        <PhotoRecovery />
      ) : !input ? (
        <section className="intake-card">
          <h2>More Information Needed</h2>
          <p>
            Choose a category and part type, or Not Sure, and correct any
            invalid optional measurements.
          </p>
          <Link className="button button-primary" href="/find-part/details">
            Update your details
          </Link>
        </section>
      ) : (
        <>
          <p className="info-notice">
            Your photo is not sent or analyzed for catalog search. Only
            published, customer-visible records are considered. These are
            candidates, not guaranteed replacements.
          </p>
          {busy && (
            <p role="status" aria-live="polite">
              Searching catalog records…
            </p>
          )}
          {error && (
            <div className="intake-card" role="alert">
              <p>{error}</p>
              <button
                className="button button-secondary"
                onClick={() => setRetry((n) => n + 1)}
              >
                Try search again
              </button>
            </div>
          )}
          {!busy && data?.state === "unavailable" && (
            <section className="intake-card">
              <h2>Catalog search is not connected yet</h2>
              <p>
                The catalog connection is awaiting setup and approved records.
                Your information is still here; use the guides or update your
                details.
              </p>
            </section>
          )}
          {!busy &&
            data?.state === "ready" &&
            !data.candidates.length &&
            !error && (
              <section className="intake-card">
                <h2>
                  {data.needsInformation
                    ? "More Information Needed"
                    : "No catalog match yet"}
                </h2>
                <p>We couldn&apos;t find a matching part in our catalog yet.</p>
                {data.needsInformation && (
                  <p>
                    Add a part number, a category, a brand or a few words about
                    the part. Not Sure is fine; the identification guide can
                    help.
                  </p>
                )}
              </section>
            )}
          {data?.numberNeedsClarification && (
            <p className="info-notice">
              The markings are too long to search as one exact part number. Try
              a single number exactly as stamped; other available details were
              considered.
            </p>
          )}
          {!!data?.candidates.length && (
            <>
              <p role="status">
                Showing {data.candidates.length} of {data.total} catalog
                candidates.
              </p>
              <div className="finder-candidate-grid">
                {data.candidates.map((c) => (
                  <CandidateCard key={c.hit.product_id} candidate={c} />
                ))}
              </div>
              {data.candidates.length < data.total && page < 19 && (
                <button
                  className="button button-secondary finder-more"
                  disabled={busy}
                  onClick={() => setPaging({ base, page: page + 1 })}
                >
                  View more candidates
                </button>
              )}
              {prompt && (
                <MeasurementQuestion
                  key={`${base}:${prompt.id}`}
                  prompt={prompt}
                />
              )}
            </>
          )}
          <section className="intake-card finder-result-actions">
            <h2>Keep looking or improve your details</h2>
            <Link href="/find-part/details#markings">
              Try another part number
            </Link>
            <Link href="/find-part/details">Update your details</Link>
            <Link href={browse}>Browse related parts</Link>
            <Link href={`/guides/measurements#${guide}`}>
              Read an identification guide
            </Link>
            <Link href="/find-part/next-steps">
              Continue with identification guidance
            </Link>
            <button className="button button-secondary" onClick={reset}>
              Find Another Part
            </button>
          </section>
        </>
      )}
    </WorkflowShell>
  );
}
