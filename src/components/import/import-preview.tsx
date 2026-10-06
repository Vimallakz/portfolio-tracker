"use client";

import { AlertTriangle, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  formatMoney,
  formatMoneyChange,
  formatPercentage,
  formatQuantity,
  signednessOf,
  type Signedness,
} from "@/lib/format/number";
import type { HoldingChangeStatus } from "@/lib/portfolio/comparison/snapshot-comparator";
import type { ImportPreview as ImportPreviewData, PreviewHolding } from "@/lib/portfolio/importer/preview";
import { cn } from "@/lib/utils";

type ImportPreviewProps = {
  preview: ImportPreviewData;
  isPending: boolean;
  onConfirm: (allowDuplicate: boolean) => void;
  onCancel: () => void;
};

const SIGNED_TEXT: Record<Signedness, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-muted-foreground",
};

const STATUS_LABEL: Record<HoldingChangeStatus, string> = {
  NEW: "New",
  INCREASED: "Increased",
  REDUCED: "Reduced",
  UNCHANGED: "Unchanged",
  REMOVED: "Removed",
};

const STATUS_VARIANT: Record<HoldingChangeStatus, "default" | "secondary" | "outline" | "destructive"> = {
  NEW: "default",
  INCREASED: "secondary",
  REDUCED: "secondary",
  UNCHANGED: "outline",
  REMOVED: "destructive",
};

const toNumber = (value: string | undefined | null) => (value == null ? null : Number(value));

function formatQuantityChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return `${value > 0 ? "+" : value < 0 ? "-" : "±"}${formatQuantity(Math.abs(value))}`;
}

function Signed({ value, children }: { value: number | null; children: React.ReactNode }) {
  return <span className={SIGNED_TEXT[signednessOf(value)]}>{children}</span>;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Signedness | "warning" }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "warning" ? "text-warning" : tone ? SIGNED_TEXT[tone] : null,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function HoldingRow({ holding }: { holding: PreviewHolding }) {
  const current = holding.next ?? holding.previous;
  const quantityChange = toNumber(holding.changes?.quantity);
  const pnl = toNumber(current?.pnlAmount);

  return (
    <TableRow className={holding.status === "REMOVED" ? "text-muted-foreground" : undefined}>
      <TableCell className="max-w-72">
        <div className="truncate font-medium" title={holding.name}>
          {holding.name}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{holding.type === "ETF" ? "ETF" : "Stock"}</span>
          <span aria-hidden="true">·</span>
          <span>{holding.ticker ?? "No ticker"}</span>
          {holding.isNewSecurity ? (
            <>
              <span aria-hidden="true">·</span>
              <span>First import</span>
            </>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[holding.status]}>{STATUS_LABEL[holding.status]}</Badge>
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
        <div>{formatMoney(toNumber(current?.investedAmount))}</div>
        {holding.changes && toNumber(holding.changes.investedAmount) ? (
          <div className="text-muted-foreground text-xs">{formatMoneyChange(toNumber(holding.changes.investedAmount))}</div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div>{formatMoney(toNumber(current?.currentValue))}</div>
        {holding.changes && toNumber(holding.changes.currentValue) ? (
          <div className="text-xs">
            <Signed value={toNumber(holding.changes.currentValue)}>
              {formatMoneyChange(toNumber(holding.changes.currentValue))}
            </Signed>
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div>
          <Signed value={pnl}>{formatMoneyChange(pnl)}</Signed>
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
            <Stat label="Invested" value={formatMoney(toNumber(totals.investedAmount))} />
            <Stat label="Current value" value={formatMoney(toNumber(totals.currentValue))} />
            <Stat label="P&L" value={formatMoneyChange(pnl)} tone={signednessOf(pnl)} />
            <Stat label="P&L %" value={formatPercentage(toNumber(totals.pnlPercentage))} tone={signednessOf(pnl)} />
          </dl>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Total holdings" value={summary.totalHoldings} />
            <Stat label="Existing" value={summary.existing} />
            <Stat label="New" value={summary.new} />
            <Stat label="Removed" value={summary.removed} />
            <Stat label="Quantity increases" value={summary.increased} />
            <Stat label="Quantity decreases" value={summary.reduced} />
            <Stat label="Without ticker" value={summary.withoutTicker} tone={summary.withoutTicker > 0 ? "warning" : undefined} />
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
                They will be remembered by name for future imports. Tickers are optional for now; add them later to
                enable Tickertape links.
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
              <HoldingRow key={holding.key} holding={holding} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card size="sm" className="pb-0">
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(duplicate !== null)} disabled={isPending}>
            {isPending ? "Importing…" : duplicate ? "Import anyway" : "Confirm import"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
