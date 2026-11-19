import { NextResponse } from "next/server";
import { cleanFinderInput } from "@/lib/finder-catalog/contract";
import { findCatalog } from "@/lib/finder-catalog/server";
import { CatalogError } from "@/lib/catalog/model";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
export async function POST(request: Request) {
  try {
    // Read-only browser abuse gate. RLS, not request headers, authorizes records.
    // Next may reconstruct an internal URL; compare against the browser-facing Host.
    const origin = request.headers.get("origin") || "";
    let sameOrigin = false;
    try {
      const parsed = new URL(origin);
      sameOrigin =
        parsed.origin === origin &&
        ["http:", "https:"].includes(parsed.protocol) &&
        parsed.host ===
          (request.headers.get("host") || new URL(request.url).host);
    } catch {
      /* Invalid or null Origin is rejected. */
    }
    if (
      !sameOrigin ||
      ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
    )
      throw new CatalogError("Open catalog search from PartSolved.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new CatalogError(
        "Send written details as JSON; photos are not accepted.",
        415,
      );
    if (Number(request.headers.get("content-length")) > 8192)
      throw new CatalogError("Shorten the written search details.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new CatalogError("Enter your written details.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 8192) {
          await reader.cancel();
          throw new CatalogError("Shorten the written search details.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new CatalogError("Review the written search details.");
    }
    return NextResponse.json(await findCatalog(cleanFinderInput(raw)), {
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CatalogError
            ? error.message
            : "Catalog search could not be completed. Try again or update your details.",
      },
      { status: error instanceof CatalogError ? error.status : 503, headers },
    );
  }
}
