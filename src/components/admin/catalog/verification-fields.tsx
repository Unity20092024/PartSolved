"use client";
import type { Verification, CatalogCollections } from "@/lib/catalog/model";
export function VerificationFields({
  value,
  onChange,
  collections,
  label = "Verification",
}: {
  value: Verification;
  onChange: (v: Verification) => void;
  collections: CatalogCollections;
  label?: string;
}) {
  return (
    <div className="catalog-field-grid">
      <label>
        {label} source
        <select
          value={value.source_id || ""}
          onChange={(e) =>
            onChange({ ...value, source_id: e.target.value || null })
          }
        >
          <option value="">Not recorded</option>
          {collections.sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.reference}
            </option>
          ))}
        </select>
      </label>
      <label>
        {label} date (UTC)
        <input
          type="date"
          value={value.verified_at?.slice(0, 10) || ""}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) =>
            onChange({
              ...value,
              verified_at: e.target.value
                ? `${e.target.value}T00:00:00.000Z`
                : null,
            })
          }
        />
      </label>
    </div>
  );
}
