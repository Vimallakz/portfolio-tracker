import { createHash } from "node:crypto";

/**
 * Fingerprint of a CSV's content for duplicate-import detection. Line endings,
 * a BOM and trailing whitespace are normalised so re-saving the same export in
 * another editor still matches.
 */
export function hashCsvContent(text: string): string {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "")
    .join("\n");

  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
