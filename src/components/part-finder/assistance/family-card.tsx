import Link from "next/link";
import type { PartFamily } from "@/types/assistance";
import { FamilyImage } from "./hardware-illustration";

export function FamilyCard({
  family,
  reason,
  selected,
  rejected,
  onSimilar,
  onReject,
  onAdopt,
}: {
  family: PartFamily;
  reason?: string;
  selected: boolean;
  rejected: boolean;
  onSimilar: () => void;
  onReject: () => void;
  onAdopt: () => void;
}) {
  return (
    <article className="assist-family">
      <FamilyImage family={family} />
      <div className="assist-family-copy">
        <h3>{family.name}</h3>
        <p>{reason || family.description}</p>
        {reason ? (
          <>
            <p>
              <strong>Check next:</strong> {family.check}
            </p>
            <Link
              href={`/guides/measurements#${family.guide}`}
              className="measurement-help"
            >
              Measurement and identification help
            </Link>
            <button
              className="button button-primary"
              type="button"
              aria-label={`That Looks Like My Part: ${family.name}`}
              onClick={onAdopt}
            >
              That Looks Like My Part
              <span className="sr-only">: {family.name}</span>
            </button>
            <button
              className="text-button"
              type="button"
              aria-label={`Not This One: ${family.name}`}
              onClick={onReject}
            >
              Not This One<span className="sr-only">: {family.name}</span>
            </button>
          </>
        ) : (
          <>
            <p>
              <strong>May help with:</strong> {family.problem}
            </p>
            <div className="assist-family-votes">
              <button
                className="button button-secondary"
                type="button"
                aria-pressed={selected}
                aria-label={`This Looks Similar: ${family.name}`}
                onClick={onSimilar}
              >
                This Looks Similar
                <span className="sr-only">: {family.name}</span>
              </button>
              <button
                className="text-button"
                type="button"
                aria-pressed={rejected}
                aria-label={`Not This One: ${family.name}`}
                onClick={onReject}
              >
                Not This One<span className="sr-only">: {family.name}</span>
              </button>
            </div>
            {(selected || rejected) && (
              <p className="assist-selection">
                {selected
                  ? "Selected as similar"
                  : "Set aside — you can change this"}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
