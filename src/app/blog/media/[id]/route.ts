import {
  requireBlogAdmin,
  publicBlogClient,
  serviceBlogClient,
} from "@/lib/blog/server";
import { uuid } from "@/lib/blog/content";
import { BLOG_REVIEW_HOLD_IDS } from "@/config/blog-review";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const { id } = await context.params;
    if (!uuid(id)) return new Response(null, { status: 404, headers });
    const client = publicBlogClient();
    let item = client
      ? (
          await client
            .from("blog_media")
            .select("path")
            .eq("id", id)
            .eq("state", "ready")
            .maybeSingle()
        ).data
      : null;
    if (item && client) {
      const { data: references } = await client
        .from("blog_publications")
        .select("post_id")
        .contains("media_ids", [id])
        .not("post_id", "in", `(${BLOG_REVIEW_HOLD_IDS.join(",")})`)
        .limit(1);
      if (!references?.length) item = null;
    }
    if (!item) {
      headers["X-Robots-Tag"] = "noindex";
      const { client: admin } = await requireBlogAdmin();
      item = (
        await admin
          .from("blog_media")
          .select("path")
          .eq("id", id)
          .eq("state", "ready")
          .maybeSingle()
      ).data;
    }
    if (!item) return new Response(null, { status: 404, headers });
    const { data, error } = await serviceBlogClient()
      .storage.from("blog-media")
      .download(item.path);
    if (error || !data) return new Response(null, { status: 404, headers });
    return new Response(data, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
