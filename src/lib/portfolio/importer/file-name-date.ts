const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const DAY_MONTH_YEAR = /(?:^|[^0-9])(\d{1,2})[-_. ]([a-z]{3,9})[-_. ](\d{4}|\d{2})(?![0-9])/i;
const ISO_DATE = /(?:^|[^0-9])(\d{4})-(\d{2})-(\d{2})(?![0-9])/;

/** "Jul", "JULY" and "Sept" all match; anything shorter than three letters does not. */
function monthIndex(token: string): number {
  const lower = token.toLowerCase();
  return MONTHS.findIndex((name) => name.startsWith(lower));
}

function toIsoDate(year: number, monthZeroBased: number, day: number): string | null {
  const date = new Date(Date.UTC(year, monthZeroBased, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthZeroBased || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * The export date in a Tickertape file name, as YYYY-MM-DD. Handles
 * "us_portfolio_report_12-Jul-26.csv", "22-JULY-2026" and "2026-07-12".
 * Two-digit years are 20xx. Returns null when there is no valid date.
 */
export function parseFileNameDate(fileName: string): string | null {
  const dayMonthYear = DAY_MONTH_YEAR.exec(fileName);

  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    const index = monthIndex(month);

    if (index !== -1) {
      return toIsoDate(year.length === 2 ? 2000 + Number(year) : Number(year), index, Number(day));
    }
  }

  const iso = ISO_DATE.exec(fileName);

  return iso ? toIsoDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : null;
}
