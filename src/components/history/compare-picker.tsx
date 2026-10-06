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
    <form action="/compare" className="flex flex-wrap items-end gap-3 pb-6">
      <div className="grid w-full gap-1.5 sm:w-60">
        <Label htmlFor="compare-from">From</Label>
        <NativeSelect id="compare-from" name="from" defaultValue={fromId} key={`from-${fromId}`}>
          {options}
        </NativeSelect>
      </div>
      <div className="grid w-full gap-1.5 sm:w-60">
        <Label htmlFor="compare-to">To</Label>
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
