import { randomUUID } from "node:crypto";
import {
  requireBlogAdmin,
  assertBlogOrigin,
  requireBlogWrites,
  databaseError,
} from "@/lib/blog/server";
import { emptyArticle } from "@/lib/blog/content";
import { blogFailure, blogResponse } from "@/lib/blog/http";
export async function POST(request: Request) {
  try {
    assertBlogOrigin(request);
    const { client } = await requireBlogAdmin();
    requireBlogWrites();
    const id = randomUUID();
    const document = emptyArticle(`draft-${id}`);
    const { data, error } = await client
      .from("blog_posts")
      .insert({ id, document })
      .select("*")
      .single();
    databaseError(error);
    return blogResponse(data, 201);
  } catch (error) {
    return blogFailure(error);
  }
}
