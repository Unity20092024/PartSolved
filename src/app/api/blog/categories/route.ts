import { randomUUID } from "node:crypto";
import {
  requireBlogAdmin,
  assertBlogOrigin,
  requireBlogWrites,
  databaseError,
  BlogError,
} from "@/lib/blog/server";
import { validSlug, uuid } from "@/lib/blog/content";
import { blogFailure, blogResponse, readJson } from "@/lib/blog/http";
export async function POST(request: Request) {
  try {
    assertBlogOrigin(request);
    const { client } = await requireBlogAdmin();
    requireBlogWrites();
    const body = await readJson(request);
    if (body.action === "delete") {
      if (!uuid(body.id)) throw new BlogError("Invalid category.");
      const { error } = await client
        .from("blog_categories")
        .delete()
        .eq("id", body.id);
      databaseError(error);
      return blogResponse({ deleted: true });
    }
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 100 ||
      typeof body.slug !== "string" ||
      !validSlug(body.slug) ||
      typeof body.description !== "string" ||
      body.description.length > 500
    )
      throw new BlogError("Check the category name, URL slug and description.");
    if (body.id && !uuid(body.id)) throw new BlogError("Invalid category.");
    const item = {
      id: body.id || randomUUID(),
      name: body.name.trim(),
      slug: body.slug,
      description: body.description.trim(),
    };
    const { data, error } = await client
      .from("blog_categories")
      .upsert(item)
      .select("*")
      .single();
    databaseError(error);
    return blogResponse(data);
  } catch (error) {
    return blogFailure(error);
  }
}
