import { NotebookPen, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Money } from "@/components/currency/money";
import { ConvictionStars } from "@/components/research/conviction-stars";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityResearchView } from "@/lib/portfolio/securities/queries";
import { INVESTMENT_STATUS_LABEL } from "@/lib/research/labels";

const updatedFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const price = (value: string | null) => (value === null ? null : <Money value={Number(value)} />);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Prose({ text }: { text: string | null }) {
  return text ? <p className="text-sm whitespace-pre-line">{text}</p> : null;
}

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={value ? "mt-0.5 font-semibold tabular-nums" : "text-muted-foreground mt-0.5"}>{value ?? "Not set"}</dd>
    </div>
  );
}

export function ResearchSummary({ securityId, research }: { securityId: string; research: SecurityResearchView | null }) {
  const editHref = `/securities/${securityId}/research`;

  if (!research) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No research added yet."
        description="Add your investment thesis to make this security easier to evaluate later."
        action={{ label: "Add research", href: editHref }}
      />
    );
  }

  const zone =
    research.accumulationMin || research.accumulationMax
      ? (
          <>
            {price(research.accumulationMin) ?? "…"} – {price(research.accumulationMax) ?? "…"}
          </>
        )
      : null;

  const cases = [
    { title: "Bull case", text: research.bullCase },
    { title: "Base case", text: research.baseCase },
    { title: "Bear case", text: research.bearCase },
  ].filter((c) => c.text);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My research</CardTitle>
        <CardDescription>Last updated {updatedFormat.format(research.updatedAt)}.</CardDescription>
        <CardAction>
          <Button asChild size="xs" variant="ghost">
            <Link href={editHref}>
              <Pencil />
              Edit research
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Conviction</span>
            {research.conviction ? <ConvictionStars conviction={research.conviction} /> : <span className="text-muted-foreground">Not set</span>}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Status</span>
            {research.investmentStatus ? (
              <Badge variant="secondary">{INVESTMENT_STATUS_LABEL[research.investmentStatus]}</Badge>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </span>
          {research.expectedHoldingPeriod ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Holding period</span>
              {research.expectedHoldingPeriod}
            </span>
          ) : null}
        </div>

        <Section title="Targets">
          <dl className={research.analystTargetManual ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-1 gap-3 sm:grid-cols-3"}>
            <Figure label="My target" value={price(research.targetPrice)} />
            {research.analystTargetManual ? (
              <Figure label="Analyst target" value={price(research.analystTargetManual)} />
            ) : null}
            <Figure label="Accumulation zone" value={zone} />
            <Figure label="Stop / exit" value={price(research.stopPrice)} />
          </dl>
        </Section>

        {research.thesis ? (
          <Section title="Investment thesis">
            <Prose text={research.thesis} />
          </Section>
        ) : null}

        {research.whyBought ? (
          <Section title="Why I bought it">
            <Prose text={research.whyBought} />
          </Section>
        ) : null}

        {cases.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {cases.map((c) => (
              <Section key={c.title} title={c.title}>
                <Prose text={c.text} />
              </Section>
            ))}
          </div>
        ) : null}

        {research.businessDescription ? (
          <Section title="What the company does">
            <Prose text={research.businessDescription} />
          </Section>
        ) : null}

        {research.risks ? (
          <Section title="Risks">
            <Prose text={research.risks} />
          </Section>
        ) : null}

        {research.personalNotes ? (
          <Section title="My notes">
            <Prose text={research.personalNotes} />
          </Section>
        ) : null}
      </CardContent>
    </Card>
  );
}
