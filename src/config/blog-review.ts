// Owner-designated test article. Remove this hold only after explicit approval.
// Database content and existing publication snapshots are preserved unchanged.
export const BLOG_REVIEW_HOLD_IDS = [
  "bb983350-1c99-4b30-ad3a-5157313b020d",
] as const;
export const isReviewOnlyArticle = (id: string) =>
  BLOG_REVIEW_HOLD_IDS.some((value) => value === id.toLowerCase());
