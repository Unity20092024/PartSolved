import { NextResponse } from "next/server";
import { passwordInput, setAdministratorPassword } from "@/lib/blog/activation";
import { assertBlogOrigin, sessionBlogClient } from "@/lib/blog/server";
import { limitedBody, blogFailure } from "@/lib/blog/http";
import { SITE_ORIGIN } from "@/config/site";

export async function POST(request: Request) {
  const origin = process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN;
  try {
    assertBlogOrigin(request);
    const password = passwordInput(new URLSearchParams(
      (await limitedBody(request, 4096)).toString(),
    ));
    const client = await sessionBlogClient();
    await setAdministratorPassword(client, password);
    return NextResponse.redirect(new URL("/admin/blog/login?activated=1", origin), 303);
  } catch (error) {
    if (request.headers.get("accept")?.includes("text/html"))
      return NextResponse.redirect(new URL("/admin/blog/activate?error=activation", origin), 303);
    return blogFailure(error);
  }
}
