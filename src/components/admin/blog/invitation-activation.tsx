"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { invitationFragment, invitationConfirmationUrl } from "@/lib/blog/invitation";

export type ActivationState = "anonymous" | "ready" | "membership_required";
export function InvitationActivation({ projectUrl, activationUrl, initialState, initialEmail }: {
  projectUrl: string; activationUrl: string; initialState: ActivationState; initialEmail?: string;
}) {
  const [state, setState] = useState(initialState);
  const [email, setEmail] = useState(initialEmail);
  const [credential, setCredential] = useState<{ refresh_token: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const captured = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const hash = window.location.hash;
    if (!hash) return;
    // Fragments never reach the server. Remove them before any user interaction;
    // keep only the refresh credential in component memory until acceptance.
    window.history.replaceState(null, "", window.location.pathname);
    // Apply the consumed external browser state after this hydration effect.
    queueMicrotask(() => {
      try { setCredential(invitationFragment(hash)); setState("anonymous"); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid invitation."); }
    });
  }, []);
  async function accept() {
    if (!credential || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/blog/activate/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify(credential), signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The invitation could not be accepted.");
      setCredential(null); setEmail(result.email); setState(result.state);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The invitation could not be accepted."); }
    finally { setBusy(false); }
  }
  function openOriginal(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      const url = invitationConfirmationUrl(linkInput.current?.value || "", projectUrl, activationUrl);
      if (linkInput.current) linkInput.current.value = "";
      // Only navigate to the configured project's official verification endpoint.
      window.location.assign(url);
    } catch { setError("Paste the original invitation link from this PartSolved Supabase project. Do not paste a password or API key."); }
  }
  return <>
    {error && <p role="alert" className="blog-notice">{error}</p>}
    {credential && <div className="blog-notice">
      <p>Your invitation link has returned. Continue to verify the invited account. Accepting an invitation does not grant publishing permissions.</p>
      <button type="button" className="button button-primary" onClick={accept} disabled={busy}>{busy ? "Verifying invitation…" : "Continue invitation"}</button>
    </div>}
    {email && <p>Invited account: <strong>{email}</strong></p>}
    {state === "membership_required" && <div role="status" className="blog-notice">
      <p>Your invitation was accepted, but this account has no administrator membership. Publishing remains unavailable. Ask the owner to grant access, then reload this page.</p>
      <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>Check administrator access again</button>
    </div>}
    {state === "ready" && <form action="/api/blog/activate" method="post">
      <p>Confirm the account above is yours, then choose a unique password of 12–128 characters.</p>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <button className="button button-primary" type="submit">Set password</button>
    </form>}
    {state === "anonymous" && !credential && <p>Open the confirmation link in your Supabase invitation email. You do not need a custom email template or SMTP provider for eligible test recipients.</p>}
    <details>
      <summary>Testing in Preview? Open your original invitation here</summary>
      <p>If the email points to the production site, long-press its confirmation button on Android and copy the link. Paste it below. The original token is verified by Supabase, with the return address restricted to this activation page. Add this exact address to Supabase Redirect URLs first:</p>
      <p style={{ overflowWrap: "anywhere" }}><code>{activationUrl}</code></p>
      <form onSubmit={openOriginal}>
        <label>Original invitation confirmation link<input ref={linkInput} type="url" autoComplete="off" spellCheck={false} required maxLength={4096} /></label>
        <button type="submit" className="button button-secondary">Open invitation in this environment</button>
      </form>
      <p>Do not share your invitation link. An expired or consumed link needs a fresh owner-issued email.</p>
    </details>
  </>;
}
