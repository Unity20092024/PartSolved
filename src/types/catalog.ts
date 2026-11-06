import type {
  IdentificationIntake,
  MeasurementRequirement,
  Unit,
} from "./intake";

// Future ingestion boundaries only. No supplier records or matching adapter are connected.
export interface AffiliateCheckoutLink {
  supplier: string;
  url: string;
}
export interface ProductRecord {
  supplier: string;
  supplierProductId: string;
  title: string;
  categorySlug: string;
  partType?: string;
  manufacturer?: string;
  markings?: string[];
  measurements?: {
    id: string;
    value: number;
    unit: Unit;
    documentationUrl?: string;
  }[];
  measurementRequirements?: MeasurementRequirement[];
  images?: { url: string; alt: string; rightsReference: string }[];
  affiliateCheckout?: AffiliateCheckoutLink;
  importedAt: string;
  sourceFileReference: string;
}
export interface CandidateMatch {
  product: ProductRecord;
  evidence: string[];
  unverifiedDetails: string[];
  compatibility: "unverified" | "documented";
  documentationUrls: string[];
}
export interface MatchingResult {
  candidates: CandidateMatch[];
  unresolvedInformation: string[];
}
export interface MatchingProvider {
  identify(
    intake: IdentificationIntake,
    localPhoto?: Blob,
  ): Promise<MatchingResult>;
}
