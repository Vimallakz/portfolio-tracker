"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCurrency, useMoneyFormat } from "@/components/currency/currency-provider";
import { PlannerStat } from "@/components/planner/planner-stat";
import { SignedValue } from "@/components/shared/signed-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { convertFromUsd, convertToUsd } from "@/lib/currency/currency";
import { formatCompactMoney, formatMoney, formatPercentage } from "@/lib/format/number";
import { annualizeMonthlyReturn } from "@/lib/portfolio/planner/earnings";
import {
  projectInvestment,
  STEP_UP_INTERVALS,
  type ProjectionPoint,
  type StepUp,
  type StepUpInterval,
} from "@/lib/portfolio/planner/projection";
import { cn } from "@/lib/utils";

const YEAR_PRESETS = [1, 3, 5, 10, 20] as const;
const MAX_YEARS = 50;

/** Monthly return used when the portfolio has no measured history yet: about 10% a year. */
const FALLBACK_MONTHLY_RETURN = 0.8;
/** Gap between the scenarios and the base rate, per month (about 3% a year). */
const SCENARIO_SPREAD = 0.25;
/** Above this yearly rate the projection is flagged as unlikely to last. */
const HIGH_ANNUAL_RETURN = 25;

const round2 = (value: number) => Math.round(value * 100) / 100;

function parseNumber(draft: string): number | null {
  if (draft.trim() === "") return null;
  const value = Number(draft);
  return Number.isFinite(value) ? value : null;
}

/** An amount typed in the display currency and reported in USD. Re-renders its text when the currency changes. */
function MoneyInput({ id, usdValue, onChange }: { id: string; usdValue: number; onChange: (usd: number) => void }) {
  const { currency, rate } = useCurrency();
  const toDraft = (usd: number) => String(round2(convertFromUsd(usd, currency, rate)));

  const [draft, setDraft] = useState(() => toDraft(usdValue));
  const [draftCurrency, setDraftCurrency] = useState(currency);

  if (draftCurrency !== currency) {
    setDraftCurrency(currency);
    setDraft(toDraft(usdValue));
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
        {currency === "INR" ? "₹" : "$"}
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="pl-6 tabular-nums"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const value = parseNumber(event.target.value);
          if (value !== null) onChange(convertToUsd(value, currency, rate));
        }}
      />
    </div>
  );
}

function PillButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "focus-visible:ring-ring/50 h-8 min-w-11 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-3",
        pressed
          ? "bg-primary text-primary-foreground border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function yearRows(points: ProjectionPoint[]): ProjectionPoint[] {
  const last = points.at(-1)!;
  const rows = points.filter((point) => point.month > 0 && point.month % 12 === 0);
  return rows.at(-1)?.month === last.month || last.month === 0 ? rows : [...rows, last];
}

function horizonLabel(month: number, totalMonths: number): string {
  if (month === 0) return "Now";
  return totalMonths <= 24 ? `${month}m` : `Y${month / 12}`;
}

type ProjectionCalculatorProps = {
  currentValue: number;
  investedAmount: number;
  defaultContribution: number;
  contributionSource: string;
  /** Monthly return, 0–100 scale. Null when nothing is measured yet. */
  averageReturn: number | null;
  returnSource: string;
};

export function ProjectionCalculator({
  currentValue,
  investedAmount,
  defaultContribution,
  contributionSource,
  averageReturn,
  returnSource,
}: ProjectionCalculatorProps) {
  const id = useId();
  const { currency, rate } = useCurrency();
  const { money, moneyChange } = useMoneyFormat();

  const baseReturn = round2(averageReturn ?? FALLBACK_MONTHLY_RETURN);
  const scenarios = [
    { id: "conservative", label: "Conservative", value: round2(baseReturn - SCENARIO_SPREAD) },
    { id: "average", label: averageReturn === null ? "Market average" : "Your average", value: baseReturn },
    { id: "optimistic", label: "Optimistic", value: round2(baseReturn + SCENARIO_SPREAD) },
  ];

  const [contribution, setContribution] = useState(Math.max(0, defaultContribution));
  const [returnDraft, setReturnDraft] = useState(String(baseReturn));
  const [yearsDraft, setYearsDraft] = useState("5");
  const [stepUpEnabled, setStepUpEnabled] = useState(false);
  const [stepUpEvery, setStepUpEvery] = useState<StepUpInterval>(12);
  const [stepUpKind, setStepUpKind] = useState<StepUp["kind"]>("percent");
  const [stepUpPercent, setStepUpPercent] = useState("10");
  const [stepUpAmount, setStepUpAmount] = useState(Math.max(10, round2(defaultContribution * 0.1)));

  const [resetCount, setResetCount] = useState(0);

  const monthlyReturn = parseNumber(returnDraft) ?? 0;
  const years = Math.min(MAX_YEARS, Math.max(1, Math.round(parseNumber(yearsDraft) ?? 1)));
  const stepUp = useMemo<StepUp | null>(
    () =>
      stepUpEnabled
        ? {
            everyMonths: stepUpEvery,
            kind: stepUpKind,
            value: stepUpKind === "percent" ? (parseNumber(stepUpPercent) ?? 0) : stepUpAmount,
          }
        : null,
    [stepUpEnabled, stepUpEvery, stepUpKind, stepUpPercent, stepUpAmount],
  );

  const projection = useMemo(
    () =>
      projectInvestment({
        startValue: currentValue,
        startInvested: investedAmount,
        monthlyContribution: contribution,
        monthlyReturn,
        months: years * 12,
        stepUp,
      }),
    [currentValue, investedAmount, contribution, monthlyReturn, years, stepUp],
  );

  const chartData = useMemo(
    () =>
      projection.points.map((point) => ({
        month: point.month,
        invested: convertFromUsd(point.invested, currency, rate),
        value: convertFromUsd(point.value, currency, rate),
      })),
    [projection, currency, rate],
  );

  const totalMonths = years * 12;
  const tickStep = totalMonths <= 24 ? 3 : totalMonths <= 120 ? 12 : 24;
  const ticks = projection.points.filter((point) => point.month % tickStep === 0).map((point) => point.month);
  const annualReturn = annualizeMonthlyReturn(monthlyReturn);
  const finalContribution = projection.points.at(-1)!.contribution;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where this plan leads</CardTitle>
        <CardDescription>
          Starts from today&apos;s portfolio value and your own numbers. Change any input to try a different plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid content-start gap-2">
            <Label htmlFor={`${id}-contribution`}>Monthly investment</Label>
            <MoneyInput
              key={resetCount}
              id={`${id}-contribution`}
              usdValue={contribution}
              onChange={setContribution}
            />
            <p className="text-muted-foreground text-xs">Starts at {contributionSource}.</p>
          </div>

          <div className="grid content-start gap-2">
            <Label htmlFor={`${id}-return`}>Expected return per month</Label>
            <div className="relative">
              <Input
                id={`${id}-return`}
                type="number"
                inputMode="decimal"
                step="0.05"
                className="pr-7 tabular-nums"
                value={returnDraft}
                onChange={(event) => setReturnDraft(event.target.value)}
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Return scenario">
              {scenarios.map((scenario) => (
                <PillButton
                  key={scenario.id}
                  pressed={monthlyReturn === scenario.value}
                  onClick={() => setReturnDraft(String(scenario.value))}
                >
                  {scenario.label} {scenario.value}%
                </PillButton>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              About {formatPercentage(annualReturn, 1)} a year. &quot;{scenarios[1].label}&quot; is {returnSource}.
            </p>
          </div>

          <div className="grid content-start gap-2">
            <Label htmlFor={`${id}-years`}>Years</Label>
            <Input
              id={`${id}-years`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_YEARS}
              step={1}
              className="tabular-nums"
              value={yearsDraft}
              onChange={(event) => setYearsDraft(event.target.value)}
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Years">
              {YEAR_PRESETS.map((preset) => (
                <PillButton key={preset} pressed={years === preset} onClick={() => setYearsDraft(String(preset))}>
                  {preset}Y
                </PillButton>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={stepUpEnabled}
              onChange={(event) => setStepUpEnabled(event.target.checked)}
            />
            Step up my monthly investment
          </label>
          {stepUpEnabled ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor={`${id}-step-every`}>Every</Label>
                <NativeSelect
                  id={`${id}-step-every`}
                  value={stepUpEvery}
                  onChange={(event) => setStepUpEvery(Number(event.target.value) as StepUpInterval)}
                >
                  {STEP_UP_INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {interval} months
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-step-kind`}>Increase by</Label>
                <NativeSelect
                  id={`${id}-step-kind`}
                  value={stepUpKind}
                  onChange={(event) => setStepUpKind(event.target.value as StepUp["kind"])}
                >
                  <option value="percent">Percentage</option>
                  <option value="amount">Fixed amount</option>
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-step-value`}>{stepUpKind === "percent" ? "Percentage" : "Amount"}</Label>
                {stepUpKind === "percent" ? (
                  <div className="relative">
                    <Input
                      id={`${id}-step-value`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      className="pr-7 tabular-nums"
                      value={stepUpPercent}
                      onChange={(event) => setStepUpPercent(event.target.value)}
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">
                      %
                    </span>
                  </div>
                ) : (
                  <MoneyInput id={`${id}-step-value`} usdValue={stepUpAmount} onChange={setStepUpAmount} />
                )}
              </div>
            </div>
          ) : null}
        </div>

        {annualReturn > HIGH_ANNUAL_RETURN ? (
          <Alert>
            <TriangleAlert />
            <AlertTitle>This return is unusually high</AlertTitle>
            <AlertDescription>
              {formatPercentage(annualReturn, 1)} a year is well above the long-run stock market average of about
              10%. Short histories often look better than what lasts, so check the Conservative scenario too.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-label="Projection result" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PlannerStat
            label={`Projected value in ${years} ${years === 1 ? "year" : "years"}`}
            detail={`Market adds ${moneyChange(projection.projectedGain)} from today`}
          >
            {money(projection.finalValue)}
          </PlannerStat>
          <PlannerStat
            label="Total invested"
            detail={`${money(investedAmount)} so far + ${money(projection.totalContributed)} new`}
          >
            {money(projection.finalInvested)}
          </PlannerStat>
          <PlannerStat
            label={`Absolute return in ${years} ${years === 1 ? "year" : "years"}`}
            detail={
              <SignedValue value={projection.totalProfit}>{moneyChange(projection.totalProfit)} profit on invested</SignedValue>
            }
          >
            <SignedValue value={projection.totalProfit}>{formatPercentage(projection.absoluteReturn)}</SignedValue>
          </PlannerStat>
          <PlannerStat
            label="Monthly investment at the end"
            detail={stepUp ? `Up from ${money(contribution)}` : "No step-up"}
          >
            {money(finalContribution)}
          </PlannerStat>
        </section>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, totalMonths]}
                ticks={ticks}
                tickFormatter={(month: number) => horizonLabel(month, totalMonths)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                labelFormatter={(month) => (Number(month) === 0 ? "Now" : `Month ${month}`)}
                formatter={(value, name) => [formatMoney(Number(value), currency), name]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Area
                dataKey="value"
                name="Projected value"
                type="monotone"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Area
                dataKey="invested"
                name="Total invested"
                type="monotone"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.1}
                strokeDasharray="4 4"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Monthly investment</TableHead>
              <TableHead className="text-right">Total invested</TableHead>
              <TableHead className="text-right">Projected value</TableHead>
              <TableHead className="text-right">Absolute return</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearRows(projection.points).map((point) => (
              <TableRow key={point.month}>
                <TableCell>
                  {point.month % 12 === 0 ? `Year ${point.month / 12}` : `Month ${point.month}`}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(point.contribution)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(point.invested)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{money(point.value)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <SignedValue value={point.value - point.invested}>
                    {point.invested > 0 ? formatPercentage(((point.value - point.invested) / point.invested) * 100) : "—"}
                  </SignedValue>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-muted-foreground text-xs">
          A projection, not a promise: it assumes the same return every month and the investment added at month-end.
          Real returns vary, and past returns do not guarantee future ones.
        </p>

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setContribution(Math.max(0, defaultContribution));
              setReturnDraft(String(baseReturn));
              setYearsDraft("5");
              setStepUpEnabled(false);
              setResetCount((count) => count + 1);
            }}
          >
            Reset to my numbers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
