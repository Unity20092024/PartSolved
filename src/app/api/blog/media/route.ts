import { randomUUID } from "node:crypto";
import { normalizeArticleImage } from "@/lib/blog/images";
import {
  requireBlogAdmin,
  assertBlogOrigin,
  requireBlogWrites,
  databaseError,
  BlogError,
} from "@/lib/blog/server";
import { blogFailure, blogResponse, limitedBody } from "@/lib/blog/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { client } = await requireBlogAdmin();
    const offset = Number(new URL(request.url).searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000)
      throw new BlogError("Invalid image page.");
    const { data, error } = await client
      .from("blog_media")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 199);
    databaseError(error);
    return blogResponse(data);
  } catch (error) {
    return blogFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertBlogOrigin(request);
    const { client } = await requireBlogAdmin();
    requireBlogWrites();
    const alt = request.headers.get("x-image-alt")
      ? decodeURIComponent(request.headers.get("x-image-alt")!)
      : "";
    if (!alt.trim() || alt.length > 300)
      throw new BlogError("Add descriptive alt text before uploading.");
    const input = await limitedBody(request, 2_097_152);
    const { data: bytes, info } = await normalizeArticleImage(input);
    const id = randomUUID(),
      path = `${id}.webp`;
    const { error: insert } = await client.from("blog_media").insert({
      id,
      path,
      alt: alt.trim(),
      width: info.width,
      height: info.height,
      bytes: bytes.length,
    });
    databaseError(insert);
    const { error: upload } = await client.storage
      .from("blog-media")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (upload) {
      await client
        .from("blog_media")
        .update({ state: "deleting" })
        .eq("id", id);
      throw new BlogError(
        "Image upload failed. The media manager lets you remove or retry incomplete uploads.",
        503,
      );
    }
    const { data, error } = await client
      .from("blog_media")
      .update({ state: "ready" })
      .eq("id", id)
      .select("*")
      .single();
    databaseError(error);
    return blogResponse(data, 201);
  } catch (error) {
    return blogFailure(error);
  }
}
