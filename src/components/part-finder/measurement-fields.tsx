"use client";
import { useState } from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { convertGroup } from "@/lib/intake";
import type {
  MeasurementGroup,
  PartTypeDefinition,
  Unit,
} from "@/types/intake";
export function MeasurementFields({
  definition,
  group,
  onChange,
  errors,
  enabled = true,
}: {
  enabled?: boolean;
  definition: PartTypeDefinition | undefined;
  group: MeasurementGroup;
  onChange: (group: MeasurementGroup) => void;
  errors: Record<string, string>;
}) {
  const [unitError, setUnitError] = useState("");
  return (
    <section className="form-section" aria-labelledby="measurements-title">
      <div className="form-section-heading">
        <h2 id="measurements-title" tabIndex={-1}>
          Measurements <span className="optional">(if known)</span>
        </h2>
        {definition && (
          <label className="unit-label">
            Measurement units
            <select
              value={group.unit}
              onChange={(event) => {
                const next = convertGroup(group, event.target.value as Unit);
                if (next) {
                  onChange(next);
                  setUnitError("");
                } else
                  setUnitError(
                    "Correct or clear saved invalid values before changing units. Uncheck Unknown to edit a saved value.",
                  );
              }}
            >
              <option value="in">Inches</option>
              <option value="mm">Millimeters</option>
            </select>
          </label>
        )}
      </div>
      <p className="field-hint provisional-notice">
        These are provisional identification prompts, not fit or compatibility
        specifications. Manufacturer documentation must verify the final
        measurements. Leave a field blank or choose Unknown if you cannot safely
        measure it.
      </p>
      {unitError && (
        <p className="field-error" role="alert">
          {unitError}
        </p>
      )}
      {definition ? (
        <>
          <div className="measurement-grid">
            {definition.measurements.map((field) => {
              const answer = group.values[field.id] ?? {
                value: "",
                unknown: false,
              };
              return (
                <div className="measurement-field" key={field.id}>
                  <label htmlFor={`measure-${field.id}`}>
                    {field.label}{" "}
                    <span className="unit-suffix">({group.unit})</span>
                  </label>
                  <Link
                    className="measurement-help"
                    href={`/guides/measurements#${field.guide}`}
                    aria-label={`How to measure ${field.label.toLowerCase()}`}
                  >
                    <CircleHelp size={17} aria-hidden="true" />
                    How to measure
                  </Link>
                  <input
                    id={`measure-${field.id}`}
                    name={field.id}
                    type="text"
                    inputMode={group.unit === "mm" ? "decimal" : "text"}
                    maxLength={30}
                    value={answer.value}
                    disabled={answer.unknown}
                    onChange={(event) =>
                      onChange({
                        ...group,
                        values: {
                          ...group.values,
                          [field.id]: { ...answer, value: event.target.value },
                        },
                      })
                    }
                    aria-invalid={!!errors[field.id]}
                    aria-describedby={`hint-${field.id}${errors[field.id] ? ` error-${field.id}` : ""}`}
                    placeholder={
                      group.unit === "in"
                        ? "Decimal or fraction"
                        : "Decimal millimeters"
                    }
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={answer.unknown}
                      onChange={(event) =>
                        onChange({
                          ...group,
                          values: {
                            ...group.values,
                            [field.id]: {
                              ...answer,
                              unknown: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Unknown
                  </label>
                  <p className="field-hint" id={`hint-${field.id}`}>
                    {field.help}
                  </p>
                  {errors[field.id] && (
                    <p className="field-error" id={`error-${field.id}`}>
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="field-hint">
            Inches accept decimals or fractions (for example, 1.5 or 1 1/2).
            Millimeters accept decimals. Unit changes convert valid values and
            may round; confirm against your original measurements.
          </p>
        </>
      ) : (
        <p className="field-hint">
          Select a recognized part type for specific measurement prompts. For
          Other or Not Sure, describe any measurements and the points you
          measured below.
        </p>
      )}
      <label className="field-label" htmlFor="measurement-notes">
        Measurement notes <span className="optional">(optional)</span>
      </label>
      <textarea
        id="measurement-notes"
        disabled={!enabled}
        maxLength={1000}
        rows={3}
        value={group.notes}
        onChange={(event) => onChange({ ...group, notes: event.target.value })}
        placeholder="Describe end fittings, reference points, or another measurement."
      />
    </section>
  );
}
