import { createClient } from "@supabase/supabase-js";
import { acceptInvitation } from "@/lib/blog/activation";
import { assertBlogOrigin, blogConfig, BlogError, sessionBlogClient } from "@/lib/blog/server";
import { limitedBody, blogFailure, blogResponse } from "@/lib/blog/http";

export async function POST(request: Request) {
  try {
    assertBlogOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new BlogError("Use the private activation screen.", 415);
    const config = blogConfig();
    if (!config) throw new BlogError("The Supabase connection is not configured.", 503);
    let body: unknown;
    try { body = JSON.parse((await limitedBody(request, 4096)).toString()); }
    catch (error) { if (error instanceof BlogError) throw error; throw new BlogError("The invitation could not be read."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BlogError("Invalid invitation session.");
    const isolated = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) }) },
    });
    const result = await acceptInvitation(isolated, (body as Record<string, unknown>).refresh_token);
    const client = await sessionBlogClient();
    const { error } = await client.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
    if (error) throw new BlogError("The invitation session could not be established.", 401);
    // A non-admin keeps an authenticated session while awaiting an owner grant.
    // Every publishing/password mutation independently checks live membership.
    return blogResponse({ email: result.email, state: result.allowed ? "ready" : "membership_required" });
  } catch (error) { return blogFailure(error); }
}
