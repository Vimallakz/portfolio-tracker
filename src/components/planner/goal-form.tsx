"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { CardShell } from "@/components/shared/card-shell";
import { MoneyInput, parseNumber } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvestmentGoal } from "@/lib/portfolio/planner/goal";
import { deleteGoal, saveGoal } from "@/lib/portfolio/planner/goal-actions";

const DEFAULT_INFLATION = 3;

function GoalForm({
  goal,
  defaultMonth,
  onDone,
}: {
  goal: InvestmentGoal | null;
  /** "YYYY-MM" suggested for a new goal. */
  defaultMonth: string;
  onDone: () => void;
}) {
  const id = useId();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(goal?.name ?? "");
  const [amount, setAmount] = useState(goal?.targetAmount ?? 10_000);
  const [month, setMonth] = useState(goal?.targetMonth ?? defaultMonth);
  const [inflationOn, setInflationOn] = useState(goal?.inflationRate != null);
  const [inflationDraft, setInflationDraft] = useState(String(goal?.inflationRate ?? DEFAULT_INFLATION));

  function submit() {
    startTransition(async () => {
      const result = await saveGoal({
        name,
        targetAmount: amount,
        targetMonth: month,
        inflationRate: inflationOn ? (parseNumber(inflationDraft) ?? 0) : null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(goal ? "Goal updated" : "Goal saved");
      onDone();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteGoal();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Goal removed");
      onDone();
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-name`}>Goal</Label>
          <Input
            id={`${id}-name`}
            placeholder="e.g. House deposit"
            maxLength={80}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-amount`}>Target amount</Label>
          <MoneyInput id={`${id}-amount`} usdValue={amount} onChange={setAmount} />
          <p className="text-muted-foreground text-xs">In today&apos;s money.</p>
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${id}-month`}>Reach it by</Label>
          <Input
            id={`${id}-month`}
            type="month"
            required
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        <div className="grid content-start gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={inflationOn}
              onChange={(event) => setInflationOn(event.target.checked)}
            />
            Add inflation
          </label>
          <div className="relative">
            <Input
              aria-label="Inflation per year"
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              step="0.1"
              disabled={!inflationOn}
              className="pr-14 tabular-nums"
              value={inflationDraft}
              onChange={(event) => setInflationDraft(event.target.value)}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">
              % a year
            </span>
          </div>
          <p className="text-muted-foreground text-xs">Raises the target to what it will cost then.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Save goal
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onDone}>
          Cancel
        </Button>
        {goal ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive ml-auto"
            disabled={isPending}
            onClick={remove}
          >
            <Trash2 />
            Remove goal
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** The goal card: the server-rendered summary, or the form while setting or editing the goal. */
export function GoalPanel({
  goal,
  defaultMonth,
  description,
  children,
}: {
  goal: InvestmentGoal | null;
  defaultMonth: string;
  description: ReactNode;
  /** Shown when not editing; null when there is no goal yet. */
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <CardShell
      title="Your goal"
      description={editing ? "Amounts are in your display currency and saved in USD." : description}
      actions={
        editing ? undefined : (
          <Button type="button" size="sm" variant={goal ? "outline" : "default"} onClick={() => setEditing(true)}>
            {goal ? <Pencil /> : <Plus />}
            {goal ? "Edit goal" : "Set a goal"}
          </Button>
        )
      }
    >
      {editing ? <GoalForm goal={goal} defaultMonth={defaultMonth} onDone={() => setEditing(false)} /> : children}
    </CardShell>
  );
}
