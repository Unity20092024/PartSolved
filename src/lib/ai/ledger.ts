import "server-only";
import { DAILY_CAP_MICROS, MONTHLY_CAP_MICROS, RESERVE_MICROS } from "./policy";

export async function ledgerRpc<T>(
  name: string,
  values: Record<string, unknown>,
): Promise<T> {
  // Reuse the future blog's project; do not introduce a second database/client SDK.
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key || new URL(base).protocol !== "https:")
    throw new Error("Accounting unavailable");
  const response = await fetch(
    `${base.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    },
  );
  if (!response.ok) throw new Error("Accounting unavailable");
  return (await response.json()) as T;
}
export interface Reservation {
  allowed: boolean;
  reason: string;
}
export function reserveAnalysis(
  id: string,
  session: string,
  ip: string,
  count: number,
  model: string,
) {
  return ledgerRpc<Reservation>("ai_reserve_analysis", {
    p_id: id,
    p_session: session,
    p_ip: ip,
    p_images: count,
    p_model: model,
    p_reserve: RESERVE_MICROS,
    p_daily_cap: DAILY_CAP_MICROS,
    p_monthly_cap: MONTHLY_CAP_MICROS,
  });
}
export function settleAnalysis(
  id: string,
  input: number,
  output: number,
  cost: number,
  status: string,
) {
  return ledgerRpc<boolean>("ai_settle_analysis", {
    p_id: id,
    p_input: input,
    p_output: output,
    p_cost: cost,
    p_status: status,
  });
}
