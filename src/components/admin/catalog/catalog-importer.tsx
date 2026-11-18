"use client";
import { useRef, useState } from "react";
import {
  importFields,
  defaultMapping,
  MAX_IMPORT_BYTES,
  type ImportSheet,
  type FieldMapping,
  type ImportPlan,
} from "@/lib/catalog/imports";
import { type CatalogCollections } from "@/lib/catalog/model";
import type { CatalogPort, CatalogBatch } from "./catalog-port";
export function CatalogImporter({
  collections,
  port,
  enabled,
  batches,
  onImported,
  rehearsal = false,
}: {
  collections: CatalogCollections;
  port: CatalogPort;
  enabled: boolean;
  batches: CatalogBatch[];
  onImported: () => void;
  rehearsal?: boolean;
}) {
  const file = useRef<HTMLInputElement>(null),
    [sheet, setSheet] = useState<ImportSheet | null>(null),
    [mapping, setMapping] = useState<FieldMapping>({}),
    [source, setSource] = useState(""),
    [synthetic, setSynthetic] = useState(true),
    [plan, setPlan] = useState<ImportPlan | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [completed, setCompleted] = useState<string[]>([]);
  const attempts = useRef<{ id: string; products: ImportPlan["products"] }[]>(
    [],
  );
  const invalidate = () => {
    setPlan(null);
    setCompleted([]);
    attempts.current = [];
  };
  async function parse() {
    setBusy(true);
    setMessage("");
    invalidate();
    try {
      const selected = file.current?.files?.[0];
      if (!selected) throw new Error("Choose a CSV or XLSX file.");
      if (selected.size > MAX_IMPORT_BYTES)
        throw new Error("Import files must be no larger than 3 MiB.");
      const data = await port.parse(selected);
      setSheet(data);
      setMapping(defaultMapping(data.headers));
      setMessage(
        "File parsed. Review field mappings before validating draft records.",
      );
    } catch (error) {
      setSheet(null);
      setMessage(
        error instanceof Error ? error.message : "File could not be read.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    if (!sheet) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await port.preview(
        sheet,
        mapping,
        collections,
        source,
        synthetic,
      );
      setPlan(result);
      setCompleted([]);
      attempts.current = [];
      setMessage(
        result.errors.length
          ? "Correct the listed row errors, then validate again."
          : "Mappings validated. No products have been saved or published.",
      );
    } catch (error) {
      setPlan(null);
      setMessage(error instanceof Error ? error.message : "Validation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!plan || plan.errors.length) return;
    setBusy(true);
    try {
      if (!attempts.current.length)
        for (let i = 0; i < plan.products.length; i += 10)
          attempts.current.push({
            id: crypto.randomUUID(),
            products: plan.products.slice(i, i + 10),
          });
      const done = [...completed];
      for (const batch of attempts.current) {
        if (done.includes(batch.id)) continue;
        await port.commit(batch.products, batch.id, source, synthetic);
        done.push(batch.id);
        setCompleted([...done]);
      }
      setMessage(
        rehearsal
          ? "Rehearsal import complete in browser memory. No database changes."
          : "Draft batches imported. Nothing was published.",
      );
      onImported();
    } catch (error) {
      setMessage(
        (error instanceof Error ? error.message : "Import failed.") +
          " Completed batches remain listed; retry uses the same batch IDs, or roll them back if untouched.",
      );
      onImported();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Map a supplier file into draft records</h2>
      <p>
        UTF-8 CSV or XLSX, first worksheet only. Maximum 3 MiB, 500 rows and 40
        columns. Store Excel identifiers as text to preserve leading zeros.
        Formulas, macros and external links are not imported.
      </p>
      <p>
        Product slug + variant key explicitly group rows. Two supplier SKUs can
        reference one manufacturer product. No visual or cross-reference
        equivalence is inferred.
      </p>
      <p>
        <a href="/api/catalog/export?template=1">
          Download the header-only CSV template
        </a>
      </p>
      <fieldset disabled={busy || !enabled}>
        <label>
          Import file
          <input ref={file} type="file" accept=".csv,.xlsx" />
        </label>
        <button
          type="button"
          className="catalog-button catalog-secondary"
          onClick={() => void parse()}
        >
          Read file &amp; map columns
        </button>
        {sheet && (
          <>
            <p className="catalog-note">{sheet.notice}</p>
            <div className="catalog-field-grid">
              <label>
                Import source
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    invalidate();
                  }}
                >
                  <option value="">Choose provenance</option>
                  {collections.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.reference}
                    </option>
                  ))}
                </select>
              </label>
              <label className="catalog-checkbox">
                <input
                  type="checkbox"
                  checked={synthetic}
                  disabled={rehearsal}
                  onChange={(e) => {
                    setSynthetic(e.target.checked);
                    invalidate();
                  }}
                />
                This file contains synthetic/development data
              </label>
            </div>
            <details open>
              <summary>Field mappings</summary>
              <div className="catalog-field-grid">
                {importFields.map((field) => (
                  <label key={field}>
                    {field.replaceAll("_", " ")}
                    {[
                      "product_slug",
                      "title",
                      "manufacturer_slug",
                      "family_id",
                    ].includes(field)
                      ? " *"
                      : ""}
                    <select
                      value={mapping[field] || ""}
                      onChange={(e) => {
                        const next = { ...mapping };
                        if (e.target.value) next[field] = e.target.value;
                        else delete next[field];
                        setMapping(next);
                        invalidate();
                      }}
                    >
                      <option value="">Do not import this field</option>
                      {sheet.headers.map((header) => (
                        <option key={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
            <h3>Source preview — first five rows</h3>
            <div className="catalog-table-wrap">
              <table>
                <thead>
                  <tr>
                    {sheet.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell.slice(0, 180)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="catalog-button"
              onClick={() => void preview()}
            >
              Validate mappings &amp; duplicates
            </button>
          </>
        )}
        {plan && (
          <section className="catalog-import-plan">
            <h3>Draft import review</h3>
            <p>
              {plan.counts.rows} source rows · {plan.counts.products} products ·{" "}
              {plan.counts.variants} variants · {plan.counts.offers} supplier
              offers
            </p>
            {plan.errors.length ? (
              <ul role="alert">
                {plan.errors.map((error, i) => (
                  <li key={i}>
                    {error.row ? `Row ${error.row}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul>
                  {plan.products.slice(0, 20).map((p) => (
                    <li key={p.id}>
                      {p.title} · {p.variants.length} variants · draft only
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="catalog-button"
                  disabled={
                    completed.length > 0 &&
                    completed.length === Math.ceil(plan.products.length / 10)
                  }
                  onClick={() => {
                    if (
                      confirm(
                        "Import these validated records as private drafts? Nothing will be published.",
                      )
                    )
                      void commit();
                  }}
                >
                  Import draft batches
                </button>
              </>
            )}
          </section>
        )}
      </fieldset>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <h3>Recent import batches</h3>
      {batches.length ? (
        <ul className="catalog-batches">
          {batches.map((batch) => (
            <li key={batch.id}>
              <div>
                <strong>{batch.status}</strong>
                <small>{batch.id}</small>
              </div>
              <button
                type="button"
                className="catalog-small-button"
                disabled={!enabled || busy || batch.status !== "committed"}
                onClick={async () => {
                  if (
                    !confirm(
                      "Roll back this batch only if every created record is untouched and unreferenced?",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await port.rollback(batch.id);
                    setMessage(
                      "Safe rollback complete. Shared manufacturers, suppliers, sources and audit history are retained.",
                    );
                    onImported();
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Rollback refused.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Roll back untouched drafts
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No import batches have been recorded.</p>
      )}
    </section>
  );
}
