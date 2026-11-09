// No network calls by default. --execute requires explicit approval + reviewer access.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
const manifest = JSON.parse(
  await readFile("tests/ai/development-collection.json", "utf8"),
);
const execute = process.argv.includes("--execute");
const selectedCases = process.argv
  .filter((argument) => argument.startsWith("--case="))
  .map((argument) => argument.slice(7));
for (const id of selectedCases)
  if (!manifest.cases.some((item) => item.id === id))
    throw new Error(`Unknown evaluation case: ${id}`);
if (execute && process.env.AI_EVAL_APPROVED !== "true")
  throw new Error(
    "Set AI_EVAL_APPROVED=true only after approving photo transfer and API costs.",
  );
const origin = process.env.AI_EVAL_ORIGIN;
const cookie = process.env.AI_REVIEW_COOKIE;
if (execute && (!origin || !cookie))
  throw new Error(
    "Reviewer origin and cookie are required. Never put secrets in a manifest or report.",
  );
const results = [];
for (const item of manifest.cases) {
  const file = await readFile(item.file);
  if (createHash("sha256").update(file).digest("hex") !== item.sha256)
    throw new Error(
      `Photo changed: ${item.id}. Review its label before evaluating.`,
    );
  if (!execute || (selectedCases.length && !selectedCases.includes(item.id)))
    continue;
  const body = new FormData();
  const jpeg = await sharp(file)
    .rotate()
    .flatten({ background: "white" })
    .resize({
      width: 1536,
      height: 1536,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  if (jpeg.length > 700 * 1024)
    throw new Error(`Analysis copy exceeds size limit: ${item.id}`);
  body.append(
    "photos",
    new Blob([jpeg], { type: "image/jpeg" }),
    "analysis.jpg",
  );
  const start = Date.now();
  const response = await fetch(new URL("/api/hardware/analyze", origin), {
    method: "POST",
    body,
    redirect: "error",
    signal: AbortSignal.timeout(45_000),
    headers: {
      origin,
      cookie: `partsolved-ai-review=${cookie}`,
      "x-photo-consent": "openai-v1",
      "idempotency-key": randomUUID(),
    },
  });
  if (!response.ok) {
    results.push({
      id: item.id,
      status: response.status,
      outcome: "not-evaluated",
    });
    break;
  }
  const { analysis } = await response.json();
  results.push({
    id: item.id,
    status: response.status,
    latencyMs: Date.now() - start,
    outcome: analysis.outcome,
    suggestedFamilies: analysis.candidates.map((c) => c.familyId),
    expectedFamilies: item.expectedFamilies,
    expectedUnknown: item.expectedUnknown,
    expertReviewRequired: item.expectedFamilies === null,
  });
  // Same production limits apply: at most 3 analyses/session, 5/minute, 10/IP/day.
  // Stop on any rejection; never bypass accounting to finish an evaluation.
}
if (execute) {
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    `artifacts/ai-development-evaluation-${Date.now()}.json`,
    JSON.stringify(
      {
        model: process.env.OPENAI_VISION_MODEL || "gpt-5.4-mini-2026-03-17",
        evaluatedAt: new Date().toISOString(),
        warning: manifest.purpose,
        results,
      },
      null,
      2,
    ),
  );
}
console.log(
  JSON.stringify(
    {
      mode: execute
        ? "live reviewer evaluation"
        : "manifest validation only; no photos sent",
      checkedFiles: manifest.cases.length,
      provisionalKnownCases: manifest.cases.filter(
        (c) => c.expectedFamilies?.length,
      ).length,
      expertReviewRequired: manifest.cases.filter(
        (c) => c.expectedFamilies === null,
      ).length,
      controls: manifest.cases.filter((c) => c.expectedUnknown).length,
      requestsCompleted: results.filter((r) => r.status === 200).length,
      publicReleaseApproved: false,
    },
    null,
    2,
  ),
);
