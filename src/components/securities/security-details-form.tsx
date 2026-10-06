"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { updateSecurityDetails } from "@/lib/portfolio/securities/actions";
import {
  securityDetailsFormSchema,
  type SecurityDetailsFormValues,
} from "@/lib/portfolio/securities/schema";

type SecurityDetailsFormProps = {
  securityId: string;
  defaultValues: SecurityDetailsFormValues;
  /** Hide sector and industry, for the quick ticker-mapping list. */
  compact?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function SecurityDetailsForm({ securityId, defaultValues, compact = false, onSaved, onCancel }: SecurityDetailsFormProps) {
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SecurityDetailsFormValues>({
    resolver: zodResolver(securityDetailsFormSchema),
    defaultValues,
  });

  async function onSubmit(values: SecurityDetailsFormValues) {
    const result = await updateSecurityDetails(securityId, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Saved successfully");
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id={`${formId}-ticker`}
          label="Ticker"
          description={compact ? undefined : "The symbol it trades under, like GRAB or VOO."}
          error={errors.ticker?.message}
        >
          <Input autoComplete="off" className="uppercase" {...register("ticker")} />
        </FormField>
        <FormField id={`${formId}-type`} label="Type" error={errors.type?.message}>
          <NativeSelect {...register("type")}>
            <option value="STOCK">Stock</option>
            <option value="ETF">ETF</option>
          </NativeSelect>
        </FormField>
        <FormField
          id={`${formId}-tickertape`}
          label="Tickertape ticker"
          description={compact ? undefined : "Only if Tickertape's page uses a different symbol."}
          error={errors.tickertapeTicker?.message}
        >
          <Input placeholder="Same as ticker" autoComplete="off" className="uppercase placeholder:normal-case" {...register("tickertapeTicker")} />
        </FormField>
      </div>

      {compact ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-sector`} label="Sector" error={errors.sector?.message}>
            <Input {...register("sector")} />
          </FormField>
          <FormField id={`${formId}-industry`} label="Industry" error={errors.industry?.message}>
            <Input {...register("industry")} />
          </FormField>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
