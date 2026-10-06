"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

import { Money } from "@/components/currency/money";
import { HoldingStatusBadge } from "@/components/shared/holding-status-badge";
import { SignedValue as Signed, SIGNED_TEXT_CLASS } from "@/components/shared/signed-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSnapshotDate as formatDate } from "@/lib/format/date";
import {
  formatPercentage,
  formatQuantity,
  formatQuantityChange,
  signednessOf,
  type Signedness,
} from "@/lib/format/number";
import type { ImportPreview as ImportPreviewData, PreviewHolding } from "@/lib/portfolio/importer/preview";
import { isValidTicker, normalizeTicker } from "@/lib/portfolio/securities/ticker";
import { cn } from "@/lib/utils";

type ImportPreviewProps = {
  preview: ImportPreviewData;
  isPending: boolean;
  /** tickers maps preview holding keys to what the user typed, blanks included. */
  onConfirm: (allowDuplicate: boolean, tickers: Record<string, string>) => void;
  onCancel: () => void;
};

const toNumber = (value: string | undefined | null) => (value == null ? null : Number(value));

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Signedness | "warning" }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "warning" ? "text-warning" : tone ? SIGNED_TEXT_CLASS[tone] : null,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

type TickerInput = { value: string; error: string | null; onChange: (value: string) => void };

const needsTicker = (holding: PreviewHolding) => holding.status !== "REMOVED" && !holding.ticker;

/** Format and duplicate errors per holding key, mirroring the server's checks. */
function tickerErrors(tickers: Record<string, string>): Record<string, string> {
  const filled = Object.entries(tickers).filter(([, value]) => value.trim() !== "");
  const counts = new Map<string, number>();

  for (const [, value] of filled) {
    const ticker = normalizeTicker(value);
    counts.set(ticker, (counts.get(ticker) ?? 0) + 1);
  }

  return Object.fromEntries(
    filled.flatMap(([key, value]) => {
      const ticker = normalizeTicker(value);

      if (!isValidTicker(ticker)) return [[key, "Letters and digits only"]];
      if ((counts.get(ticker) ?? 0) > 1) return [[key, "Entered twice"]];
      return [];
    }),
  );
}

function HoldingRow({ holding, tickerInput }: { holding: PreviewHolding; tickerInput?: TickerInput }) {
  const current = holding.next ?? holding.previous;
  const quantityChange = toNumber(holding.changes?.quantity);
  const pnl = toNumber(current?.pnlAmount);
  const inputId = `ticker-${holding.key}`;

  return (
    <TableRow className={holding.status === "REMOVED" ? "text-muted-foreground" : undefined}>
      <TableCell className="max-w-72">
        <div className="truncate font-medium" title={holding.name}>
          {holding.name}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{holding.type === "ETF" ? "ETF" : "Stock"}</span>
          {tickerInput ? null : (
            <>
              <span aria-hidden="true">·</span>
              <span>{holding.ticker ?? "No ticker"}</span>
            </>
          )}
          {holding.isNewSecurity ? (
            <>
              <span aria-hidden="true">·</span>
              <span>First import</span>
            </>
          ) : null}
        </div>
        {tickerInput ? (
          <div className="mt-1.5 grid gap-1">
            <Input
              id={inputId}
              value={tickerInput.value}
              onChange={(event) => tickerInput.onChange(event.target.value)}
              placeholder="Ticker (optional)"
              aria-label={`Ticker for ${holding.name}`}
              aria-invalid={tickerInput.error ? true : undefined}
              aria-describedby={tickerInput.error ? `${inputId}-error` : undefined}
              autoComplete="off"
              maxLength={13}
              className="h-7 w-40 uppercase placeholder:normal-case md:text-xs"
            />
            {tickerInput.error ? (
              <p id={`${inputId}-error`} className="text-destructive text-xs" role="alert">
                {tickerInput.error}
              </p>
            ) : null}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <HoldingStatusBadge status={holding.status} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {holding.previous && holding.next ? (
          <>
            <div>
              {formatQuantity(toNumber(holding.previous.quantity))} → {formatQuantity(toNumber(holding.next.quantity))}
            </div>
            {quantityChange ? (
              <div className="text-xs">
                <Signed value={quantityChange}>{formatQuantityChange(quantityChange)}</Signed>
              </div>
            ) : null}
          </>
        ) : (
          formatQuantity(toNumber(current?.quantity))
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div><Money value={toNumber(current?.investedAmount)} /></div>
        {holding.changes && toNumber(holding.changes.investedAmount) ? (
          <div className="text-muted-foreground text-xs"><Money value={toNumber(holding.changes.investedAmount)} change /></div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div><Money value={toNumber(current?.currentValue)} /></div>
        {holding.changes && toNumber(holding.changes.currentValue) ? (
          <div className="text-xs">
            <Signed value={toNumber(holding.changes.currentValue)}>
              <Money value={toNumber(holding.changes.currentValue)} change />
            </Signed>
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div>
          <Signed value={pnl}><Money value={pnl} change /></Signed>
        </div>
        <div className="text-xs">
          <Signed value={pnl}>{formatPercentage(toNumber(current?.pnlPercentage))}</Signed>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {holding.status === "REMOVED" ? "—" : `${formatQuantity(toNumber(current?.weight))}%`}
      </TableCell>
    </TableRow>
  );
}

export function ImportPreview({ preview, isPending, onConfirm, onCancel }: ImportPreviewProps) {
  const { summary, totals, duplicate } = preview;
  const pnl = toNumber(totals.pnlAmount);
  const [tickers, setTickers] = useState<Record<string, string>>({});

  const errors = tickerErrors(tickers);
  const hasTickerErrors = Object.keys(errors).length > 0;
  const stillWithoutTicker = preview.holdings.filter(
    (h) => needsTicker(h) && (!tickers[h.key]?.trim() || errors[h.key]),
  ).length;

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Import preview</CardTitle>
          <CardDescription>
            {preview.profileName} · snapshot {formatDate(preview.snapshotDate)} · {preview.fileName}
            <br />
            {preview.previousSnapshotDate
              ? `Compared with the snapshot from ${formatDate(preview.previousSnapshotDate)}.`
              : "This will be the first snapshot for this profile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Invested" value={<Money value={toNumber(totals.investedAmount)} />} />
            <Stat label="Current value" value={<Money value={toNumber(totals.currentValue)} />} />
            <Stat label="P&L" value={<Money value={pnl} change />} tone={signednessOf(pnl)} />
            <Stat label="P&L %" value={formatPercentage(toNumber(totals.pnlPercentage))} tone={signednessOf(pnl)} />
          </dl>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Total holdings" value={summary.totalHoldings} />
            <Stat label="Existing" value={summary.existing} />
            <Stat label="New" value={summary.new} />
            <Stat label="Removed" value={summary.removed} />
            <Stat label="Quantity increases" value={summary.increased} />
            <Stat label="Quantity decreases" value={summary.reduced} />
            <Stat label="Without ticker" value={stillWithoutTicker} tone={stillWithoutTicker > 0 ? "warning" : undefined} />
          </dl>

          {duplicate ? (
            <Alert className="border-warning/50">
              <AlertTriangle className="text-warning" />
              <AlertTitle>This portfolio snapshot appears to already exist</AlertTitle>
              <AlertDescription>
                {duplicate.reason === "SAME_CONTENT"
                  ? `A file with identical content was imported for ${formatDate(duplicate.snapshotDate)}.`
                  : `A snapshot dated ${formatDate(duplicate.snapshotDate)} already exists for this profile.`}{" "}
                Importing again creates a second snapshot; the existing one is never changed.
              </AlertDescription>
            </Alert>
          ) : null}

          {summary.newSecurities > 0 || summary.withoutTicker > 0 ? (
            <Alert>
              <Info />
              <AlertTitle>
                {summary.newSecurities > 0
                  ? `${summary.newSecurities} ${summary.newSecurities === 1 ? "security is" : "securities are"} being imported for the first time`
                  : "Some securities have no ticker yet"}
              </AlertTitle>
              <AlertDescription>
                They will be remembered by name for future imports. Type a ticker in the table below to save it with
                this import, or add it later under Securities → Add tickers. Tickers enable Tickertape links.
              </AlertDescription>
            </Alert>
          ) : null}

          {preview.derivedFields.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Not in the file, so calculated from the other columns: {preview.derivedFields.join(", ")}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Security</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Invested</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.holdings.map((holding) => (
              <HoldingRow
                key={holding.key}
                holding={holding}
                tickerInput={
                  needsTicker(holding)
                    ? {
                        value: tickers[holding.key] ?? "",
                        error: errors[holding.key] ?? null,
                        onChange: (value) => setTickers((current) => ({ ...current, [holding.key]: value })),
                      }
                    : undefined
                }
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card size="sm" className="pb-0">
        <CardFooter className="justify-end gap-2">
          {hasTickerErrors ? (
            <p className="text-destructive mr-auto text-xs">Fix the highlighted tickers, or clear them, to continue.</p>
          ) : null}
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(duplicate !== null, tickers)} disabled={isPending || hasTickerErrors}>
            {isPending ? "Importing…" : duplicate ? "Import anyway" : "Confirm import"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
