import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";

export const REPORT_TYPES = ["month", "quarter", "range"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportPeriod = {
  type: ReportType;
  /** First month, "YYYY-MM". */
  start: string;
  /** Last month, "YYYY-MM". */
  end: string;
  label: string;
};

/** The months that have data: from the first snapshot's month to the latest one's. */
export type DataSpan = { first: string; latest: string };

type SearchParams = { [key: string]: string | string[] | undefined };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const QUARTER = /^(\d{4})-Q([1-4])$/;

const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const toDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

export const formatMonthLong = (month: string) => monthLong.format(toDate(month));
export const formatMonthShort = (month: string) => monthShort.format(toDate(month));

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function quarterOf(month: string): string {
  return `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;
}

function quarterMonths(quarter: string): { start: string; end: string } {
  const [, year, number] = QUARTER.exec(quarter)!;
  const start = `${year}-${String((Number(number) - 1) * 3 + 1).padStart(2, "0")}`;

  return { start, end: addMonths(start, 2) };
}

export function formatQuarter(quarter: string): string {
  const { start, end } = quarterMonths(quarter);
  const [year, number] = quarter.split("-Q");

  return `Q${number} ${year} (${formatMonthShort(start).split(" ")[0]}–${formatMonthShort(end)})`;
}

/** Every month with data, newest first. */
export function listMonths(span: DataSpan): string[] {
  const months: string[] = [];
  for (let month = span.latest; month >= span.first; month = addMonths(month, -1)) {
    months.push(month);
  }
  return months;
}

/** Every quarter that overlaps the data, newest first. */
export function listQuarters(span: DataSpan): string[] {
  return [...new Set(listMonths(span).map(quarterOf))];
}

const inSpan = (month: string, span: DataSpan) => month >= span.first && month <= span.latest;

/**
 * The period a report URL asks for. Anything missing, malformed or outside the
 * data falls back to a sensible default: the latest month, the latest
 * quarter, or the last six months.
 */
export function parseReportPeriod(params: SearchParams, span: DataSpan): ReportPeriod {
  const type = REPORT_TYPES.find((option) => option === single(params.type)) ?? "month";

  if (type === "quarter") {
    const requested = single(params.quarter);
    const quarter =
      requested && QUARTER.test(requested) && listQuarters(span).includes(requested) ? requested : quarterOf(span.latest);

    return { type, ...quarterMonths(quarter), label: formatQuarter(quarter) };
  }

  if (type === "range") {
    const from = single(params.from);
    const to = single(params.to);
    let start = from && MONTH.test(from) && inSpan(from, span) ? from : [addMonths(span.latest, -5), span.first].sort().at(-1)!;
    let end = to && MONTH.test(to) && inSpan(to, span) ? to : span.latest;

    if (start > end) [start, end] = [end, start];

    return {
      type,
      start,
      end,
      label: start === end ? formatMonthLong(start) : `${formatMonthShort(start)} – ${formatMonthShort(end)}`,
    };
  }

  const requested = single(params.month);
  const month = requested && MONTH.test(requested) && inSpan(requested, span) ? requested : span.latest;

  return { type, start: month, end: month, label: formatMonthLong(month) };
}
