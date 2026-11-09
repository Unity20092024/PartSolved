import { NextRequest, NextResponse } from "next/server";
import {
  ipHash,
  readReviewSession,
  REVIEW_COOKIE,
  sameOrigin,
  sign,
} from "@/lib/ai/access";
import { analysisImages } from "@/lib/ai/images";
import { reserveAnalysis, settleAnalysis, ledgerRpc } from "@/lib/ai/ledger";
import { analyzeWithOpenAI } from "@/lib/ai/openai";
import { costMicros, DEFAULT_MODEL, verifyReservation } from "@/lib/ai/policy";
export const runtime = "nodejs";
export const maxDuration = 60;
const reply = (message: string, status: number) =>
  NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return reply("Photo Assist is not available for this request.", 403);
  const session = readReviewSession(request.cookies.get(REVIEW_COOKIE)?.value);
  if (!session)
    return reply(
      "Photo Assist is available only to authorized development reviewers.",
      403,
    );
  const id = request.headers.get("idempotency-key") ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    request.headers.get("x-photo-consent") !== "openai-v1"
  )
    return reply("Confirm your selected photos before analysis.", 400);
  const model = process.env.OPENAI_VISION_MODEL || DEFAULT_MODEL;
  let ip: string;
  try {
    verifyReservation(model);
    if (!process.env.OPENAI_API_KEY) throw new Error("Missing configuration");
    ip = ipHash(request);
    if (
      !(await ledgerRpc<boolean>("ai_take_rate_slot", {
        p_ip: ip,
        p_action: "analyze",
      }))
    )
      return reply("Too many requests. Please wait before trying again.", 429);
  } catch {
    return reply(
      "Photo Assist is temporarily unavailable. Your photos and manual answers are unchanged.",
      503,
    );
  }
  let images: Buffer[];
  try {
    images = await analysisImages(request);
  } catch {
    return reply(
      "Choose up to three JPEG, PNG or WebP analysis copies, each at most 700 KiB and 1536 pixels per side.",
      400,
    );
  }
  try {
    const reservation = await reserveAnalysis(
      id,
      sign(`ledger:${session}`),
      ip,
      images.length,
      model,
    );
    if (!reservation.allowed)
      return reply(
        "The analysis allowance is unavailable or reached. You can continue with the manual finder.",
        429,
      );
  } catch {
    return reply(
      "Usage accounting is unavailable. No analysis was started.",
      503,
    );
  }
  try {
    const outcome = await analyzeWithOpenAI(
      images,
      model,
      AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    );
    const reconciled = await settleAnalysis(
      id,
      outcome.input,
      outcome.output,
      costMicros(model, outcome.input, outcome.output),
      outcome.result ? "completed" : "unusable",
    );
    if (!reconciled || !outcome.result)
      return reply(
        "The photo could not be analyzed safely. Try the manual finder or a clearer photo.",
        502,
      );
    return NextResponse.json(
      { analysis: outcome.result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // No retry/refund: provider may already have processed/billed a timed-out call.
    // The reservation remains charged until trusted usage can be reconciled.
    return reply(
      "Analysis did not finish. Your information is unchanged; you can continue without AI.",
      503,
    );
  } finally {
    images.length = 0;
  }
}
