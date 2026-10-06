/**
 * An Indian PAN is 10 characters: AAAAA9999A. Masking keeps the first five and
 * the final check character so the user can recognise which PAN it is, without
 * rendering the whole number.
 */
export function maskPan(pan: string | null | undefined): string | null {
  if (!pan) {
    return null;
  }

  const normalized = pan.trim().toUpperCase();

  if (normalized.length < 6) {
    return "*".repeat(normalized.length);
  }

  const head = normalized.slice(0, 5);
  const tail = normalized.slice(-1);

  return `${head}${"*".repeat(normalized.length - 6)}${tail}`;
}

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidPan(pan: string): boolean {
  return PAN_PATTERN.test(pan.trim().toUpperCase());
}
