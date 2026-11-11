import { NextResponse } from "next/server";
import {
  assertBlogOrigin,
  blogConfig,
  sessionBlogClient,
  BlogError,
} from "@/lib/blog/server";
import { limitedBody, blogFailure } from "@/lib/blog/http";
import { SITE_ORIGIN } from "@/config/site";
export async function POST(request: Request) {
  try {
    assertBlogOrigin(request);
    if (!blogConfig())
      throw new BlogError("Connect Supabase before signing in.", 503);
    const form = new URLSearchParams(
      (await limitedBody(request, 4096)).toString(),
    );
    const client = await sessionBlogClient();
    if (form.get("action") === "logout") {
      await client.auth.signOut({ scope: "local" });
      return NextResponse.redirect(
        new URL(
          "/admin/blog/login",
          process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN,
        ),
        303,
      );
    }
    const email = form.get("email") || "",
      password = form.get("password") || "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      password.length > 200 ||
      password.length < 1
    )
      throw new BlogError("Enter your email and password.");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      throw new BlogError(
        "Unable to sign in. Check your credentials and try again.",
        401,
      );
    const { data: allowed, error: permission } =
      await client.rpc("blog_is_admin");
    if (permission || allowed !== true) {
      await client.auth.signOut({ scope: "local" });
      throw new BlogError("This account does not have publishing access.", 403);
    }
    return NextResponse.redirect(
      new URL("/admin/blog", process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN),
      303,
    );
  } catch (error) {
    if (request.headers.get("accept")?.includes("text/html"))
      return NextResponse.redirect(
        new URL(
          "/admin/blog/login?error=access",
          process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN,
        ),
        303,
      );
    return blogFailure(error);
  }
}
