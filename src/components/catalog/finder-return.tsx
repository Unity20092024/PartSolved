"use client";
import Link from "next/link";
import { usePhoto } from "@/components/part-finder/photo-provider";
export function FinderReturn() {
  const { draft } = usePhoto();
  return draft.catalogSearchRequested ? (
    <p>
      <Link className="catalog-text-button" href="/find-part/results">
        Back to Finder Results
      </Link>
    </p>
  ) : null;
}
