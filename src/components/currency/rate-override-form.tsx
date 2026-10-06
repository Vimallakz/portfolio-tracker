"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRateOverride } from "@/lib/currency/actions";
import { rateOverrideFormSchema, type RateOverrideFormValues } from "@/lib/currency/schema";

export function RateOverrideForm({ override }: { override: number | null }) {
  const id = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RateOverrideFormValues>({
    resolver: zodResolver(rateOverrideFormSchema),
    defaultValues: { rate: override === null ? "" : String(override) },
  });

  async function save(values: RateOverrideFormValues) {
    const result = await updateRateOverride(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(values.rate.trim() ? "Your rate is now used across the app" : "Using the market rate again");
    reset(values);
  }

  async function clearOverride() {
    reset({ rate: "" });
    await save({ rate: "" });
  }

  return (
    <form onSubmit={handleSubmit(save)} className="grid max-w-sm gap-4" noValidate>
      <FormField
        id={`${id}-rate`}
        label="Your rate (₹ per $1)"
        description="Leave blank to use the market rate. Useful to match your broker's conversion rate."
        error={errors.rate?.message}
      >
        <Input inputMode="decimal" autoComplete="off" placeholder="e.g. 88.25" {...register("rate")} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
        {override !== null ? (
          <Button type="button" size="sm" variant="ghost" onClick={clearOverride} disabled={isSubmitting}>
            Use market rate
          </Button>
        ) : null}
      </div>
    </form>
  );
}
