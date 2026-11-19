import { BlogError } from "@/lib/blog/server";
import { NextResponse } from "next/server";
import { CatalogError } from "./model";
export function catalogResponse(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function catalogFailure(error: unknown) {
  if (error instanceof SyntaxError)
    return catalogResponse(
      { error: "Invalid JSON or encoded catalog metadata." },
      400,
    );
  return catalogResponse(
    {
      error:
        error instanceof CatalogError || error instanceof BlogError
          ? error.message
          : "The catalog service could not complete this request. Try again later.",
    },
    error instanceof CatalogError || error instanceof BlogError
      ? error.status
      : 503,
  );
}
