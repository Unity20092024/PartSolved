import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const REVIEW_COOKIE = "partsolved-ai-review";
export const REVIEW_SECONDS = 6 * 60 * 60;
export function reviewEnabled() {
  // Stage 1 has NO public enable switch. Even valid reviewer cookies fail in production.
  return (
    process.env.AI_ANALYSIS_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    (process.env.VERCEL_ENV === "preview" ||
      (!process.env.VERCEL && process.env.AI_LOCAL_REVIEW === "true")) &&
    (process.env.AI_SESSION_SECRET?.length ?? 0) >= 32 &&
    (process.env.AI_REVIEW_ACCESS_TOKEN?.length ?? 0) >= 32
  );
}
export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function sign(value: string) {
  const secret = process.env.AI_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Review configuration unavailable");
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export function issueReviewSession(now = Date.now()) {
  const payload = `${randomUUID()}.${Math.floor(now / 1000) + REVIEW_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}
export function readReviewSession(
  value: string | undefined,
  now = Date.now(),
): string | null {
  if (!reviewEnabled() || !value || value.length > 180) return null;
  const [id, expiry, signature, extra] = value.split(".");
  if (
    extra ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    !/^\d+$/.test(expiry) ||
    !signature
  )
    return null;
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + REVIEW_SECONDS)
    return null;
  return equalSecret(sign(`${id}.${expiry}`), signature) ? id : null;
}
export async function canReview() {
  if (!reviewEnabled()) return false;
  return !!readReviewSession((await cookies()).get(REVIEW_COOKIE)?.value);
}
export function sameOrigin(request: Request) {
  const expected = process.env.AI_ALLOWED_ORIGIN;
  if (!expected) return false;
  try {
    const configured = new URL(expected);
    // Next can reconstruct request.url using its INTERNAL fetch hostname.
    // Check the actual HTTP Host, never an untrusted x-forwarded-host value.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return (
      configured.origin === expected &&
      host === configured.host &&
      request.headers.get("origin") === expected &&
      [null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
    );
  } catch {
    return false;
  }
}
export function ipHash(request: Request) {
  const secret = process.env.AI_IP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Rate limits unavailable");
  // Vercel overwrites this platform header. Never trust arbitrary x-forwarded-for.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : "local-review";
  if (!ip) throw new Error("Trusted client address unavailable");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
