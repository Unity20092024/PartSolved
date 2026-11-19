import "server-only";
import { publicBlogClient } from "@/lib/blog/server";
import { catalogEnabled } from "@/lib/catalog/server";
import { CatalogError } from "@/lib/catalog/model";
import {
  searchEvidence,
  explainCandidate,
  type FinderInput,
  type RankedHit,
  type FinderResponse,
} from "./contract";
export async function findCatalog(input: FinderInput): Promise<FinderResponse> {
  const evidence = searchEvidence(input);
  const base = {
    page: input.page,
    needsInformation:
      !evidence.number &&
      !evidence.brand &&
      !evidence.families.length &&
      !evidence.words.length,
    numberNeedsClarification: input.number.length > 80,
  };
  if (!catalogEnabled())
    return { ...base, state: "unavailable", candidates: [], total: 0 };
  const { data, error } = await publicBlogClient()!.rpc("catalog_find", {
    p_number: evidence.number,
    p_brand: evidence.brand,
    p_families: evidence.families,
    p_words: evidence.words,
    p_measurements: evidence.measurements,
    p_limit: 3,
    p_offset: input.page * 3,
  });
  if (error)
    throw new CatalogError(
      "Catalog search is not ready. Your photos and answers are still in this tab; use the guides or try again later.",
      503,
    );
  return {
    ...base,
    state: "ready",
    total: Number(data.total),
    candidates: (data.rows as RankedHit[])
      .filter((r) => r.hit && !r.hit.synthetic)
      .map((r) => explainCandidate(r, input)),
  };
}
