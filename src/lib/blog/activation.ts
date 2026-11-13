import type { SupabaseClient } from "@supabase/supabase-js";
import { BlogError } from "./server";

export function passwordInput(form: URLSearchParams) {
  const password = form.get("password") || "";
  if (password.length < 12 || password.length > 128 || password !== form.get("confirmation"))
    throw new BlogError("Enter matching passwords of 12–128 characters.");
  return password;
}

/** Supabase validates the credential; this function never creates users or grants roles. */
export async function acceptInvitation(client: SupabaseClient, refreshToken: unknown) {
  if (typeof refreshToken !== "string" || !/^[A-Za-z0-9._-]{8,2048}$/.test(refreshToken))
    throw new BlogError("The invitation session is missing or invalid.");
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session)
    throw new BlogError("This invitation is invalid, expired, or already used. Ask the owner for a new invitation or recovery email.", 401);
  const { data: verified, error: verificationError } = await client.auth.getUser();
  if (verificationError || !verified.user || verified.user.is_anonymous ||
      !verified.user.invited_at || !verified.user.email_confirmed_at ||
      verified.user.id !== data.session.user.id)
    throw new BlogError("A confirmed, owner-invited account is required.", 403);
  const { data: allowed, error: membershipError } = await client.rpc("blog_is_admin");
  if (membershipError) throw new BlogError("Publishing access could not be verified. Try again later.", 503);
  return { session: data.session, email: verified.user.email, allowed: allowed === true };
}

export async function setAdministratorPassword(client: SupabaseClient, password: string) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !user.invited_at || !user.email_confirmed_at || user.is_anonymous)
    throw new BlogError("Accept your owner-issued invitation first.", 401);
  const { data: allowed, error: permission } = await client.rpc("blog_is_admin");
  if (permission || allowed !== true)
    throw new BlogError("The owner must grant administrator membership before you can activate publishing access.", 403);
  const { error: passwordError } = await client.auth.updateUser({ password });
  if (passwordError) throw new BlogError("The password could not be set. Check the password policy and try again.");
  await client.auth.signOut({ scope: "local" });
}
