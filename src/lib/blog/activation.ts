import { BlogError } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Only an owner-issued invitation/recovery code can establish a session. */
export function activationInput(form: URLSearchParams) {
  const email = (form.get("email") || "").trim();
  const token = (form.get("token") || "").trim();
  const password = form.get("password") || "";
  const type = form.get("type");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !/^\d{6,10}$/.test(token) ||
    (type !== "invite" && type !== "recovery") ||
    password.length < 12 || password.length > 128 ||
    password !== form.get("confirmation")
  ) throw new BlogError("Check your email, code, and matching passwords (12–128 characters).");
  return { email, token, password, type };
}

export async function activateAdministrator(client: SupabaseClient, input: ReturnType<typeof activationInput>) {
  const { password, ...verification } = input;
  const { error } = await client.auth.verifyOtp(verification);
  if (error) throw new BlogError("The code is invalid or expired. Ask the site owner for a new code.", 401);
  try {
    // A valid email code is authentication, never permission to publish.
    const { data: allowed, error: membershipError } = await client.rpc("blog_is_admin");
    if (membershipError || allowed !== true)
      throw new BlogError("Ask the site owner to confirm your publishing access.", 403);
    const { error: passwordError } = await client.auth.updateUser({ password });
    if (passwordError) throw new BlogError("The password could not be set. Ask the site owner for a new code and check the password policy.");
  } finally {
    // Require a fresh password login and discard invitation/recovery sessions.
    await client.auth.signOut({ scope: "local" });
  }
}
