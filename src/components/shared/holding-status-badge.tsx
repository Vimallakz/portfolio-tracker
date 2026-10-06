import { Badge } from "@/components/ui/badge";
import type { HoldingChangeStatus } from "@/lib/portfolio/comparison/snapshot-comparator";

export const HOLDING_STATUS_LABEL: Record<HoldingChangeStatus, string> = {
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

export function HoldingStatusBadge({ status }: { status: HoldingChangeStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{HOLDING_STATUS_LABEL[status]}</Badge>;
}
