import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  const client = createServerClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        }),
    },
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Refresh only. The server authorization layer and RLS still check every access.
  try {
    await client.auth.getUser();
  } catch {
    /* Application routes fail closed. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = { matcher: ["/admin/blog/:path*", "/api/blog/:path*"] };
