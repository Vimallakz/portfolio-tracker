import { ChevronRight, Download } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/currency/money";
import { DeleteSnapshotButton } from "@/components/history/delete-snapshot-button";
import { SignedValue } from "@/components/shared/signed-value";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { HistoryEntry, HoldingChangeCounts } from "@/lib/portfolio/history/history";

function ChangeSummary({ changes }: { changes: HoldingChangeCounts | null }) {
  if (!changes) {
    return <span className="text-muted-foreground">First snapshot</span>;
  }

  const parts = [
    changes.new > 0 && `${changes.new} new`,
    changes.removed > 0 && `${changes.removed} removed`,
    changes.increased > 0 && `${changes.increased} increased`,
    changes.reduced > 0 && `${changes.reduced} reduced`,
  ].filter(Boolean);

  return <span className={parts.length ? undefined : "text-muted-foreground"}>{parts.length ? parts.join(" · ") : "No changes"}</span>;
}

export function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Snapshot</TableHead>
            <TableHead className="text-right">Holdings</TableHead>
            <TableHead className="text-right">Invested</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead>Changes since previous</TableHead>
            <TableHead className="w-28 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="pl-4">
                <Link href={`/history/${entry.id}`} className="font-medium hover:underline">
                  {formatSnapshotDate(entry.snapshotDate)}
                </Link>
                {entry.fileName ? (
                  <p className="text-muted-foreground max-w-48 truncate text-xs" title={entry.fileName}>
                    {entry.fileName}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{entry.totals.holdingCount}</TableCell>
              <TableCell className="text-right tabular-nums"><Money value={entry.totals.investedAmount} /></TableCell>
              <TableCell className="text-right tabular-nums">
                <div><Money value={entry.totals.currentValue} /></div>
                {entry.valueChange !== null ? (
                  <div className="text-xs">
                    <SignedValue value={entry.valueChange}><Money value={entry.valueChange} change /></SignedValue>
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedValue value={entry.totals.pnlAmount} className="block">
                  <Money value={entry.totals.pnlAmount} change />
                </SignedValue>
                <SignedValue value={entry.totals.pnlAmount} className="block text-xs">
                  {formatPercentage(entry.totals.pnlPercentage)}
                </SignedValue>
              </TableCell>
              <TableCell className="min-w-40 text-sm whitespace-normal">
                <ChangeSummary changes={entry.changes} />
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex items-center justify-end gap-3">
                  <a
                    href={`/history/${entry.id}/csv`}
                    download
                    aria-label={`Download snapshot from ${formatSnapshotDate(entry.snapshotDate)} as CSV`}
                    title="Download CSV"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Download className="size-4" />
                  </a>
                  <DeleteSnapshotButton
                    compact
                    snapshotId={entry.id}
                    label={formatSnapshotDate(entry.snapshotDate)}
                    holdingCount={entry.totals.holdingCount}
                  />
                  <Link
                    href={`/history/${entry.id}`}
                    aria-label={`Open snapshot from ${formatSnapshotDate(entry.snapshotDate)}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
