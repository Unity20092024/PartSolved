export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { reviewEnabled, canReview } from "@/lib/ai/access";
import { ledgerRpc } from "@/lib/ai/ledger";
import Link from "next/link";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
export const metadata = {
  title: "Photo Assist Development Review",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!reviewEnabled()) notFound();
  if (await canReview()) {
    let usage = null;
    try {
      usage = await ledgerRpc<{
        dayMicros: number;
        monthMicros: number;
        dailyCapMicros: number;
        monthlyCapMicros: number;
        monthRequests: number;
        unreconciledRequests: number;
        overruns: number;
        enabled: boolean;
      }>("ai_usage_summary", {});
    } catch {
      /* Never reveal backend errors or keys. */
    }
    const dollars = (micros: number) => `$${(micros / 1_000_000).toFixed(4)}`;
    return (
      <ScaffoldPage
        title="Photo Assist Development Review"
        description="Reviewer-only usage monitoring. UTC periods include reserved costs for uncertain requests."
      >
        {usage ? (
          <section className="intake-card">
            <h2>Analysis allowance</h2>
            <p>
              Today: {dollars(usage.dayMicros)} /{" "}
              {dollars(usage.dailyCapMicros)}
            </p>
            <p>
              This month: {dollars(usage.monthMicros)} /{" "}
              {dollars(usage.monthlyCapMicros)}
            </p>
            <p>
              {usage.monthRequests} requests; {usage.unreconciledRequests}{" "}
              awaiting reconciliation; {usage.overruns} overruns.
            </p>
            <p>
              Database analysis gate:{" "}
              {usage.enabled ? "enabled for authorized reviewers" : "disabled"}.
            </p>
            {usage.monthMicros >= usage.monthlyCapMicros * 0.8 && (
              <p role="status">
                At least 80% of the monthly allowance is reserved or used.
              </p>
            )}
          </section>
        ) : (
          <p role="alert">
            Usage accounting is unavailable. Analysis will remain blocked.
          </p>
        )}
        <Link className="button button-primary" href="/find-part/guided">
          Open Guided Finder
        </Link>
        <form action="/api/hardware/review" method="post">
          <input type="hidden" name="signout" value="true" />
          <button className="button button-secondary" type="submit">
            End Reviewer Session
          </button>
        </form>
      </ScaffoldPage>
    );
  }
  return (
    <ScaffoldPage
      title="Photo Assist Development Review"
      description="Private development access. This feature is not released for public use."
    >
      <form action="/api/hardware/review" method="post" className="intake-card">
        <label>
          Reviewer access token
          <input
            type="password"
            name="token"
            required
            maxLength={256}
            autoComplete="off"
          />
        </label>
        <p>
          Review sessions expire after six hours. Never use customer photos
          without permission. Accuracy has not been established.
        </p>
        <button className="button button-primary" type="submit">
          Open Development Review
        </button>
      </form>
    </ScaffoldPage>
  );
}
