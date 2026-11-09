import { NextRequest, NextResponse } from "next/server";
import {
  equalSecret,
  ipHash,
  issueReviewSession,
  reviewEnabled,
  REVIEW_COOKIE,
  REVIEW_SECONDS,
  sameOrigin,
} from "@/lib/ai/access";
import { readLimitedBody } from "@/lib/ai/images";
import { ledgerRpc } from "@/lib/ai/ledger";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!reviewEnabled() || !sameOrigin(request))
    return new NextResponse(null, { status: 403 });
  try {
    const body = await readLimitedBody(request, 1024);
    const fields = new URLSearchParams(body.toString("utf8"));
    if (fields.get("signout") === "true") {
      const response = NextResponse.redirect(
        new URL("/find-part/guided", process.env.AI_ALLOWED_ORIGIN!),
        303,
      );
      response.cookies.delete(REVIEW_COOKIE);
      return response;
    }
    if (
      !(await ledgerRpc<boolean>("ai_take_rate_slot", {
        p_ip: ipHash(request),
        p_action: "login",
      }))
    )
      return new NextResponse(null, { status: 429 });
    if (
      !equalSecret(
        fields.get("token") ?? "",
        process.env.AI_REVIEW_ACCESS_TOKEN!,
      )
    )
      return new NextResponse("Reviewer access denied.", { status: 403 });
    const response = NextResponse.redirect(
      new URL("/find-part/guided", process.env.AI_ALLOWED_ORIGIN!),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(REVIEW_COOKIE, issueReviewSession(), {
      httpOnly: true,
      secure: new URL(process.env.AI_ALLOWED_ORIGIN!).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: REVIEW_SECONDS,
    });
    return response;
  } catch {
    return new NextResponse(
      "Reviewer accounting is unavailable. No session was created.",
      { status: 503 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(REVIEW_COOKIE);
  return response;
}
