import "server-only";
import { inflateRawSync } from "node:zlib";
import { readSheet } from "read-excel-file/node";
import { CatalogError } from "./model";
import {
  checkedSheet,
  csvSheet,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_COLUMNS,
  type ImportSheet,
} from "./imports";
/** Inspect central/local ZIP headers and bounded XML before handing a workbook to
 * the parser. No extraction, macros, external relationships or formula evaluation. */
export function inspectWorkbook(bytes: Buffer) {
  if (bytes.length > MAX_IMPORT_BYTES)
    throw new CatalogError("Use a file no larger than 3 MiB.", 413);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6))
    throw new CatalogError("Use a standard, single-volume XLSX workbook.");
  const count = bytes.readUInt16LE(end + 10),
    size = bytes.readUInt32LE(end + 12);
  let offset = bytes.readUInt32LE(end + 16),
    expanded = 0;
  const names = new Set<string>();
  if (!count || count > 150 || offset + size !== end)
    throw new CatalogError("Workbook structure is unsupported or too large.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw new CatalogError("Invalid workbook archive.");
    const flags = bytes.readUInt16LE(offset + 8),
      method = bytes.readUInt16LE(offset + 10),
      compressed = bytes.readUInt32LE(offset + 20),
      uncompressed = bytes.readUInt32LE(offset + 24),
      nameLength = bytes.readUInt16LE(offset + 28),
      extra = bytes.readUInt16LE(offset + 30),
      comment = bytes.readUInt16LE(offset + 32),
      local = bytes.readUInt32LE(offset + 42);
    const name = bytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");
    expanded += uncompressed;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      uncompressed > 4 * 1024 * 1024 ||
      expanded > 12 * 1024 * 1024 ||
      names.has(name) ||
      /\.\.|^\/|\\|vba|externalLinks|embeddings/i.test(name) ||
      local + 30 > bytes.length ||
      bytes.readUInt32LE(local) !== 0x04034b50 ||
      bytes.readUInt16LE(local + 6) !== flags ||
      bytes.readUInt16LE(local + 8) !== method
    )
      throw new CatalogError(
        "Encrypted, embedded, oversized or unsafe workbook entries are unsupported.",
      );
    names.add(name);
    const localNameLength = bytes.readUInt16LE(local + 26),
      start = local + 30 + localNameLength + bytes.readUInt16LE(local + 28);
    if (
      bytes
        .subarray(local + 30, local + 30 + localNameLength)
        .toString("utf8") !== name ||
      start + compressed > bytes.length
    )
      throw new CatalogError("Inconsistent workbook archive.");
    const input = bytes.subarray(start, start + compressed),
      content =
        method === 0
          ? input
          : inflateRawSync(input, { maxOutputLength: 4 * 1024 * 1024 });
    if (content.length !== uncompressed)
      throw new CatalogError("Workbook size metadata is inconsistent.");
    if (name.endsWith(".xml") || name.endsWith(".rels")) {
      const xml = content.toString("utf8");
      if (
        /<!DOCTYPE|<!ENTITY|<\w*:?(?:f)\b|TargetMode\s*=\s*["']External/i.test(
          xml,
        )
      )
        throw new CatalogError(
          "Remove formulas, external links and XML entities before importing.",
        );
      if (/^xl\/worksheets\//.test(name)) {
        for (const attribute of xml.matchAll(/\b(?:r|ref)=["']([^"']+)["']/g)) {
          if (
            /^\d+$/.test(attribute[1]) &&
            Number(attribute[1]) > MAX_IMPORT_ROWS + 1
          )
            throw new CatalogError("Worksheet row bounds exceed 501 rows.");
          for (const match of attribute[1].matchAll(/([A-Z]+)(\d+)/gi)) {
            const col = [...match[1].toUpperCase()].reduce(
              (sum, char) => sum * 26 + char.charCodeAt(0) - 64,
              0,
            );
            if (
              col > MAX_IMPORT_COLUMNS ||
              Number(match[2]) > MAX_IMPORT_ROWS + 1
            )
              throw new CatalogError(
                "Keep worksheet cells and ranges within 40 columns and 501 rows.",
              );
          }
        }
      }
    }
    offset += 46 + nameLength + extra + comment;
  }
  if (
    offset !== end ||
    !names.has("[Content_Types].xml") ||
    !names.has("xl/workbook.xml")
  )
    throw new CatalogError("Use a valid .xlsx workbook.");
}
export async function spreadsheet(
  bytes: Uint8Array,
  extension: string,
): Promise<ImportSheet> {
  if (bytes.byteLength > MAX_IMPORT_BYTES)
    throw new CatalogError("Use a file of at most 3 MiB.", 413);
  if (extension === "csv")
    return csvSheet(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (extension !== "xlsx")
    throw new CatalogError(
      "Choose UTF-8 CSV or XLSX. Convert legacy XLS/XLSM files first.",
    );
  const buffer = Buffer.from(bytes);
  inspectWorkbook(buffer);
  const values = await readSheet(buffer, 1);
  const numericCells: string[] = [];
  const rows = values.map((row, r) =>
    row.map((cell, c) => {
      if (typeof cell === "number") numericCells.push(`${r + 1}:${c}`);
      return cell instanceof Date
        ? cell.toISOString()
        : cell === null
          ? ""
          : String(cell);
    }),
  );
  return checkedSheet(
    rows,
    numericCells,
    "Only the first worksheet is used. Identifier columns must be stored as text. Formulas and external links are rejected.",
  );
}
