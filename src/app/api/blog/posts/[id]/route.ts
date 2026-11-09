import { randomUUID } from "node:crypto";
import {
  requireBlogAdmin,
  assertBlogOrigin,
  requireBlogWrites,
  databaseError,
  schedulerReady,
  BlogError,
} from "@/lib/blog/server";
import { uuid, cleanDocument, type Article } from "@/lib/blog/content";
import { blogFailure, blogResponse, readJson } from "@/lib/blog/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertBlogOrigin(request);
    const { client } = await requireBlogAdmin();
    requireBlogWrites();
    const { id } = await context.params;
    if (!uuid(id)) throw new BlogError("Article not found.", 404);
    const body = await readJson(request);
    if (!Number.isSafeInteger(body.version) || Number(body.version) < 1)
      throw new BlogError("Reload the article before editing.", 409);
    const action = body.action;
    if (action === "save") {
      const document = cleanDocument(body.document);
      const { data, error } = await client
        .rpc("blog_save_post", {
          p_id: id,
          p_version: body.version,
          p_document: document,
        })
        .single();
      databaseError(error);
      return blogResponse(data);
    }
    const { data: current, error: missing } = await client
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();
    databaseError(missing);
    const post = current as Article;
    if (post.version !== body.version)
      throw new BlogError(
        "This article changed elsewhere. Reload before continuing.",
        409,
      );
    if (action === "duplicate") {
      const copyId = randomUUID(),
        doc = cleanDocument({
          ...post.document,
          title: `${post.document.title.slice(0, 190)} (copy)`,
          slug: `copy-${copyId}`,
          canonical_url: "",
        });
      const { data, error } = await client
        .from("blog_posts")
        .insert({ id: copyId, document: doc, media_ids: post.media_ids ?? [] })
        .select("*")
        .single();
      databaseError(error);
      return blogResponse(data, 201);
    }
    if (action === "delete") {
      const { data, error } = await client
        .from("blog_posts")
        .delete()
        .eq("id", id)
        .eq("version", body.version)
        .select("id");
      databaseError(error);
      if (!data?.length)
        throw new BlogError(
          "The article changed. Reload before deleting.",
          409,
        );
      return blogResponse({ deleted: true });
    }
    if (!["publish", "unpublish", "schedule"].includes(String(action)))
      throw new BlogError("Unknown article action.");
    if (action !== "unpublish") cleanDocument(post.document, true);
    let at: string | null = null;
    if (action === "schedule") {
      if (!schedulerReady())
        throw new BlogError(
          "Configure and verify the publication job before enabling scheduling.",
          503,
        );
      if (
        typeof body.at !== "string" ||
        !Number.isFinite(Date.parse(body.at)) ||
        Date.parse(body.at) <= Date.now()
      )
        throw new BlogError("Choose a future publication time.");
      at = new Date(body.at).toISOString();
    }
    const { data, error } = await client
      .rpc("blog_transition", {
        p_id: id,
        p_version: body.version,
        p_action: action,
        p_at: at,
      })
      .single();
    databaseError(error);
    return blogResponse(data);
  } catch (error) {
    return blogFailure(error);
  }
}
