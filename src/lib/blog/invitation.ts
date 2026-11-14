/** Browser helpers: never persist invitation credentials or send them in app URLs. */
export function invitationFragment(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("error")) throw new Error("This invitation is invalid, expired, or already used. Ask the owner for a new invitation or recovery email.");
  const type = params.get("type"), refresh = params.get("refresh_token");
  if ((type !== "invite" && type !== "recovery") || !params.get("access_token") ||
      !refresh || !/^[A-Za-z0-9._-]{8,2048}$/.test(refresh))
    throw new Error("Open your invitation confirmation link first, or paste the original link below.");
  // Discard access tokens. The server verifies the refresh credential with Supabase.
  return { refresh_token: refresh };
}
export function isInvitationLanding(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.has("access_token") || params.has("refresh_token") ||
    ["invite", "recovery"].includes(params.get("type") || "") ||
    (params.has("error") && params.has("error_code"));
}
export function invitationConfirmationUrl(input: string, projectUrl: string, activationUrl: string) {
  const url = new URL(input.trim()), project = new URL(projectUrl);
  const type = url.searchParams.get("type"), token = url.searchParams.get("token");
  if (url.protocol !== "https:" || url.origin !== project.origin || url.username || url.password ||
      url.pathname !== "/auth/v1/verify" || (type !== "invite" && type !== "recovery") ||
      !token || !/^[A-Za-z0-9_-]{16,2048}$/.test(token))
    throw new Error("Paste the original invitation link from this PartSolved Supabase project.");
  const target = new URL("/auth/v1/verify", project);
  target.searchParams.set("token", token);
  target.searchParams.set("type", type);
  target.searchParams.set("redirect_to", activationUrl);
  return target.toString();
}
