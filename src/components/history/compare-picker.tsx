import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatSnapshotDate } from "@/lib/format/date";

type SnapshotOption = { id: string; snapshotDate: string; holdingCount: number };

type ComparePickerProps = {
  snapshots: SnapshotOption[];
  fromId: string;
  toId: string;
};

/** A plain GET form, so the comparison is a shareable URL and works without JavaScript. */
export function ComparePicker({ snapshots, fromId, toId }: ComparePickerProps) {
  const options = [...snapshots].reverse().map((s) => (
    <option key={s.id} value={s.id}>
      {formatSnapshotDate(s.snapshotDate)} · {s.holdingCount} {s.holdingCount === 1 ? "holding" : "holdings"}
    </option>
  ));

  return (
    <form
      action="/compare"
      className="bg-card light:shadow-surface mb-6 flex flex-wrap items-end gap-3 rounded-xl p-3 ring-1 ring-foreground/10 light:ring-foreground/[0.08]"
    >
      <div className="grid w-full gap-1.5 sm:w-60">
        <Label htmlFor="compare-from" className="text-muted-foreground text-xs">
          From
        </Label>
        <NativeSelect id="compare-from" name="from" defaultValue={fromId} key={`from-${fromId}`}>
          {options}
        </NativeSelect>
      </div>
      <ArrowRight aria-hidden="true" className="text-muted-foreground mb-2.5 hidden size-4 sm:block" />
      <div className="grid w-full gap-1.5 sm:w-60">
        <Label htmlFor="compare-to" className="text-muted-foreground text-xs">
          To
        </Label>
        <NativeSelect id="compare-to" name="to" defaultValue={toId} key={`to-${toId}`}>
          {options}
        </NativeSelect>
      </div>
      <Button type="submit" size="sm">
        Compare
      </Button>
    </form>
  );
}
