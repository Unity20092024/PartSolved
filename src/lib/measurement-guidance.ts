import { getPartType } from "@/config/part-types";
import type { Unit } from "@/types/intake";
/** Future catalog callers may request existing prompts after explaining why.
 * This supplies guidance, never dimensions, fit rules or a matching decision. */
export function measurementGuidance(partType: string, ids: readonly string[]) {
  const definition = getPartType(partType);
  if (
    !definition ||
    !ids.length ||
    ids.some((id) => !definition.measurements.some((m) => m.id === id))
  )
    return null;
  return {
    partType,
    optional: true as const,
    canChooseUnknown: true as const,
    units: ["in", "mm"] as Unit[],
    provisional: true as const,
    prompts: definition.measurements
      .filter((m) => ids.includes(m.id))
      .map((m) => ({
        id: m.id,
        label: m.label,
        instruction: m.help,
        visualGuideHref: `/guides/measurements#${m.guide}`,
      })),
  };
}
