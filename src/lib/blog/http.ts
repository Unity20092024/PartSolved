import "server-only";
import { NextResponse } from "next/server";
import { BlogError } from "./server";
import { ContentError } from "./content";
export async function limitedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new BlogError("This upload is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BlogError("The request is empty.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new BlogError("This upload is too large.", 413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts);
}
export async function readJson(request: Request) {
  try {
    const value: unknown = JSON.parse(
      (await limitedBody(request, 1_050_000)).toString(),
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new BlogError("An object is required.");
    return value as Record<string, unknown>;
  } catch (e) {
    if (e instanceof BlogError) throw e;
    throw new BlogError("The request could not be read.");
  }
}
export function blogFailure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof BlogError || error instanceof ContentError
          ? error.message
          : "That action could not be completed. Review the form and try again.",
    },
    {
      status:
        error instanceof BlogError
          ? error.status
          : error instanceof ContentError
            ? 422
            : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export const blogResponse = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
