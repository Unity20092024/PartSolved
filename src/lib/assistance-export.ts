import {
  assistanceLocations,
  problemAreas,
  symptomChoices,
  stuckChoices,
  familyById,
} from "@/config/assistance";
import type { AssistanceState } from "@/types/assistance";
import type { GuidedAnswers } from "@/types/intake";
import { guidedLabel } from "@/config/guided";
export function assistanceSummary(
  state: AssistanceState,
  guided: GuidedAnswers,
  primary: File | null,
) {
  const label = (choices: { id: string; label: string }[], value: string) =>
    choices.find((item) => item.id === value)?.label || "Not known";
  return [
    "PartSolved — local identification notes",
    "Possible categories only. No verified product match, diagnosis or compatibility assessment.",
    "",
    "Original Guided Finder answers:",
    `Location: ${guidedLabel(guided.location)}`,
    `Function: ${guidedLabel(guided.purpose)}`,
    `Appearance: ${guidedLabel(guided.appearance)}`,
    `Measurements: ${guided.measurementNotes || "Not provided"}`,
    `Markings: ${guided.markings || "Not provided"}`,
    "",
    "Assistance answers:",
    `Location: ${label(assistanceLocations, state.location)}`,
    `Area: ${label(problemAreas(state.location), state.area)}`,
    `Symptom: ${label(symptomChoices(state.location), state.symptom)}`,
    `Gets stuck: ${label(stuckChoices, state.stuck)}`,
    `Description: ${state.description || "Not provided"}`,
    `Looks similar: ${
      state.similar
        .map((id) => familyById(id)?.name)
        .filter(Boolean)
        .join(", ") || "None selected"
    }`,
    `Ruled out by customer: ${
      state.rejected
        .map((id) => familyById(id)?.name)
        .filter(Boolean)
        .join(", ") || "None"
    }`,
    "",
    "Photos (not analyzed):",
    ...(primary ? [`Primary photo: ${primary.name}`] : ["No primary photo"]),
    ...state.photos.map(
      (photo, index) =>
        `${index + 1}. ${photo.file.name} — ${photo.purpose}${photo.point ? `; marked at ${Math.round(photo.point.x * 100)}% across, ${Math.round(photo.point.y * 100)}% down` : ""}; ${photo.note || "No note"}`,
    ),
    "",
    "Keep these notes and original photos together. Confirm measurements and manufacturer compatibility before ordering.",
  ].join("\n");
}
// A small ZIP STORE encoder keeps export local without a dependency or server.
const encoder = new TextEncoder();
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export async function localSummaryArchive(
  summary: string,
  photos: File[],
): Promise<Blob> {
  const entries = [
    { name: "identification-notes.txt", bytes: encoder.encode(summary) },
    ...(await Promise.all(
      photos.map(async (file, index) => ({
        name: `photos/${index + 1}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        bytes: new Uint8Array(await file.arrayBuffer()),
      })),
    )),
  ];
  const parts: Uint8Array<ArrayBuffer>[] = [],
    directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0,
    directorySize = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name),
      checksum = crc32(entry.bytes);
    const header = new Uint8Array(30 + name.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, checksum, true);
    h.setUint32(18, entry.bytes.length, true);
    h.setUint32(22, entry.bytes.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    const central = new Uint8Array(46 + name.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, checksum, true);
    c.setUint32(20, entry.bytes.length, true);
    c.setUint32(24, entry.bytes.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    parts.push(header, entry.bytes);
    directory.push(central);
    offset += header.length + entry.bytes.length;
    directorySize += central.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, directorySize, true);
  e.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
