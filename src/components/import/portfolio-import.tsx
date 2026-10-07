"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CsvUploader } from "@/components/import/csv-uploader";
import { ImportPreview } from "@/components/import/import-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import {
  cancelPortfolioImport,
  confirmPortfolioImport,
  previewPortfolioImport,
} from "@/lib/portfolio/importer/actions";
import type { ImportConfirmation, ImportPreview as ImportPreviewData } from "@/lib/portfolio/importer/preview";

type Step =
  | { name: "upload"; errors: string[] }
  | { name: "preview"; preview: ImportPreviewData }
  | { name: "done"; confirmation: ImportConfirmation };

export function PortfolioImport({ defaultSnapshotDate }: { defaultSnapshotDate?: string }) {
  const [step, setStep] = useState<Step>({ name: "upload", errors: [] });
  const [isPending, startTransition] = useTransition();

  function handleUpload(file: File, snapshotDate: string) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("snapshotDate", snapshotDate);

    startTransition(async () => {
      const result = await previewPortfolioImport(formData);

      setStep(
        result.ok
          ? { name: "preview", preview: result.data }
          : { name: "upload", errors: result.error.split("\n") },
      );
    });
  }

  function handleConfirm(sessionId: string, allowDuplicate: boolean, tickers: Record<string, string>) {
    startTransition(async () => {
      const result = await confirmPortfolioImport({ sessionId, allowDuplicate, tickers });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Snapshot imported");
      setStep({ name: "done", confirmation: result.data });
    });
  }

  function handleCancel(sessionId: string) {
    startTransition(async () => {
      await cancelPortfolioImport(sessionId);
      setStep({ name: "upload", errors: [] });
    });
  }

  if (step.name === "preview") {
    const { preview } = step;

    return (
      <ImportPreview
        preview={preview}
        isPending={isPending}
        onConfirm={(allowDuplicate, tickers) => handleConfirm(preview.sessionId, allowDuplicate, tickers)}
        onCancel={() => handleCancel(preview.sessionId)}
      />
    );
  }

  if (step.name === "done") {
    const { confirmation } = step;

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="text-positive size-8" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">Snapshot imported</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {confirmation.holdingCount} holdings saved for {formatSnapshotDate(confirmation.snapshotDate)}.
              {confirmation.createdSecurities > 0
                ? ` ${confirmation.createdSecurities} new ${confirmation.createdSecurities === 1 ? "security was" : "securities were"} added.`
                : null}
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStep({ name: "upload", errors: [] })}>
              Import another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {step.errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>The file could not be imported</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {step.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardContent>
          <CsvUploader isPending={isPending} onSubmit={handleUpload} defaultSnapshotDate={defaultSnapshotDate} />
        </CardContent>
      </Card>
    </div>
  );
}
