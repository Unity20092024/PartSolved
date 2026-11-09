import "server-only";
import { analysisSchema, validateAnalysis } from "./contract";
import { MAX_OUTPUT_TOKENS, systemPrompt, verifyReservation } from "./policy";

export async function analyzeWithOpenAI(
  images: Buffer[],
  model: string,
  signal: AbortSignal,
) {
  verifyReservation(model);
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Analysis unavailable");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    redirect: "error",
    cache: "no-store",
    signal,
    body: JSON.stringify({
      model,
      store: false,
      background: false,
      reasoning: { effort: "none" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: images.map((image) => ({
            type: "input_image",
            image_url: `data:image/jpeg;base64,${image.toString("base64")}`,
            detail: "high",
          })),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "hardware_families",
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  });
  // Never propagate provider bodies: they may contain customer content.
  if (!response.ok) throw new Error("Provider unavailable");
  const payload = await response.json();
  const usage = payload.usage;
  if (
    !usage ||
    !Number.isSafeInteger(usage.input_tokens) ||
    usage.input_tokens < 0 ||
    !Number.isSafeInteger(usage.output_tokens) ||
    usage.output_tokens < 0
  )
    throw new Error("Missing usage");
  let result = null;
  try {
    if (payload.status !== "completed") throw new Error("Incomplete analysis");
    const content =
      payload.output
        ?.filter((item: { type: string }) => item.type === "message")
        .flatMap((item: { content: unknown[] }) => item.content) ?? [];
    if (content.length !== 1 || content[0].type !== "output_text")
      throw new Error("No usable analysis");
    result = validateAnalysis(JSON.parse(content[0].text), images.length);
  } catch {
    /* A refusal/incomplete/invalid response is still billable. */
  }
  return {
    result,
    input: usage.input_tokens as number,
    output: usage.output_tokens as number,
  };
}
