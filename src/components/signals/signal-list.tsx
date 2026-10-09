import {
  ArrowDownToLine,
  CircleDashed,
  Clock,
  Crosshair,
  type LucideIcon,
  OctagonAlert,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import type { Signal, SignalKind } from "@/lib/portfolio/signals/signals";
import { cn } from "@/lib/utils";

const ICONS: Record<SignalKind, LucideIcon> = {
  "stop-hit": OctagonAlert,
  "above-my-target": Target,
  "near-my-target": Target,
  "above-analyst-target": TrendingUp,
  dip: TrendingDown,
  "below-cost": ArrowDownToLine,
  "in-zone": Crosshair,
  "analyst-upside": UsersRound,
  "target-gap": Scale,
  "stale-research": Clock,
  "no-target": CircleDashed,
};

const TONE_CLASS: Record<Signal["tone"], string> = {
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  neutral: "bg-muted text-muted-foreground",
};

export function SignalIcon({ signal, className }: { signal: Signal; className?: string }) {
  const Icon = ICONS[signal.kind];

  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", TONE_CLASS[signal.tone], className)}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

export function SignalList({ signals, compact = false }: { signals: Signal[]; compact?: boolean }) {
  return (
    <ul className={cn("grid", compact ? "gap-2" : "gap-3")}>
      {signals.map((signal) => (
        <li key={signal.kind} className="flex items-start gap-3">
          <SignalIcon signal={signal} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{signal.title}</p>
            {compact ? null : <p className="text-muted-foreground text-xs">{signal.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotAdviceNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-xs", className)}>
      Signals are rule-based prompts from your own levels and public analyst data. They are not financial advice.
    </p>
  );
}
