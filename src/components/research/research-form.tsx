"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { updateSecurityResearch } from "@/lib/research/actions";
import { CONVICTION_LABEL, CONVICTIONS, INVESTMENT_STATUS_LABEL, INVESTMENT_STATUSES } from "@/lib/research/labels";
import { researchFormSchema, type ResearchFormValues } from "@/lib/research/schema";

type TextKey = "thesis" | "whyBought" | "businessDescription" | "bullCase" | "baseCase" | "bearCase" | "risks" | "personalNotes";
type PriceKey = "targetPrice" | "accumulationMin" | "accumulationMax" | "stopPrice";

type ResearchFormProps = {
  securityId: string;
  defaultValues: ResearchFormValues;
};

export function ResearchForm({ securityId, defaultValues }: ResearchFormProps) {
  const formId = useId();
  const router = useRouter();
  const backHref = `/securities/${securityId}`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResearchFormValues>({
    resolver: zodResolver(researchFormSchema),
    defaultValues,
  });

  async function onSubmit(values: ResearchFormValues) {
    const result = await updateSecurityResearch(securityId, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Saved successfully");
    router.push(backHref);
  }

  const textField = (key: TextKey, label: string, rows = 3, description?: string) => (
    <FormField id={`${formId}-${key}`} label={label} description={description} error={errors[key]?.message}>
      <Textarea rows={rows} {...register(key)} />
    </FormField>
  );

  const priceField = (key: PriceKey, label: string) => (
    <FormField id={`${formId}-${key}`} label={label} error={errors[key]?.message}>
      <Input inputMode="decimal" placeholder="0.00" autoComplete="off" {...register(key)} />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Thesis</CardTitle>
          <CardDescription>Why you own it, in your own words, so you can judge it later.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {textField("thesis", "Investment thesis", 4)}
          {textField("whyBought", "Why I bought it")}
          {textField("businessDescription", "What the company does")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {textField("bullCase", "Bull case", 4)}
          {textField("baseCase", "Base case", 4)}
          {textField("bearCase", "Bear case", 4)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your own levels. The app never recommends buying or selling.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {priceField("targetPrice", "Target price")}
            {priceField("accumulationMin", "Accumulate from")}
            {priceField("accumulationMax", "Accumulate up to")}
            {priceField("stopPrice", "Stop / exit price")}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={`${formId}-conviction`} label="Conviction" error={errors.conviction?.message}>
              <NativeSelect {...register("conviction")}>
                <option value="">Not set</option>
                {CONVICTIONS.map((conviction) => (
                  <option key={conviction} value={conviction}>
                    {CONVICTION_LABEL[conviction]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id={`${formId}-status`} label="Status" error={errors.investmentStatus?.message}>
              <NativeSelect {...register("investmentStatus")}>
                <option value="">Not set</option>
                {INVESTMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {INVESTMENT_STATUS_LABEL[status]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField
              id={`${formId}-holding`}
              label="Expected holding period"
              error={errors.expectedHoldingPeriod?.message}
            >
              <Input placeholder="3–5 years" {...register("expectedHoldingPeriod")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risks and notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {textField("risks", "Risks")}
          {textField("personalNotes", "Personal notes", 4)}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={backHref}>Cancel</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}