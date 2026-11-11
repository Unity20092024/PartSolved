import {
  requireBlogAdmin,
  assertBlogOrigin,
  requireBlogWrites,
  databaseError,
  BlogError,
} from "@/lib/blog/server";
import { uuid, type BlogMedia } from "@/lib/blog/content";
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
    if (!uuid(id)) throw new BlogError("Image not found.", 404);
    const body = await readJson(request);
    if (body.action === "delete") {
      const { data: item, error } = await client
        .rpc("blog_mark_media_deleting", { p_id: id })
        .single<BlogMedia>();
      databaseError(error);
      if (!item) throw new BlogError("Image not found.", 404);
      const { error: storage } = await client.storage
        .from("blog-media")
        .remove([item.path]);
      if (storage)
        throw new BlogError(
          "Storage could not remove the image. Retry this action.",
          503,
        );
      const { error: deleted } = await client
        .from("blog_media")
        .delete()
        .eq("id", id)
        .eq("state", "deleting");
      databaseError(deleted);
      return blogResponse({ deleted: true });
    }
    if (
      typeof body.alt !== "string" ||
      !body.alt.trim() ||
      body.alt.length > 300
    )
      throw new BlogError("Add descriptive alt text.");
    const { data, error } = await client
      .from("blog_media")
      .update({ alt: body.alt.trim() })
      .eq("id", id)
      .select("*")
      .single();
    databaseError(error);
    return blogResponse(data);
  } catch (error) {
    return blogFailure(error);
  }
}
