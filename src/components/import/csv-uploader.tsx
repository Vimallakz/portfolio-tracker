"use client";

import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseFileNameDate } from "@/lib/portfolio/importer/file-name-date";
import { cn } from "@/lib/utils";

type CsvUploaderProps = {
  isPending: boolean;
  onSubmit: (file: File, snapshotDate: string) => void;
  /** Overrides today, e.g. a month-end date when arriving from the upload reminder. */
  defaultSnapshotDate?: string;
};

function todayLocalIsoDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function CsvUploader({ isPending, onSubmit, defaultSnapshotDate }: CsvUploaderProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(() => defaultSnapshotDate ?? todayLocalIsoDate());
  const [isDragging, setIsDragging] = useState(false);
  const [dateFromFileName, setDateFromFileName] = useState(false);

  function chooseFile(next: File | null) {
    setFile(next);
    const detected = next ? parseFileNameDate(next.name) : null;
    if (detected) setSnapshotDate(detected);
    setDateFromFileName(detected !== null);
  }

  function clearFile() {
    chooseFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const dateDescription = dateFromFileName
    ? "Taken from the file name. Change it if this export is for a different date."
    : file
      ? "No date found in the file name. Set the date this export represents."
      : "The date this export represents. Filled in from the file name when it has one, like 12-Jul-26.";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) onSubmit(file, snapshotDate);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped) chooseFile(dropped);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
          isDragging ? "border-primary bg-muted/60" : "bg-muted/20",
        )}
      >
        {file ? (
          <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-left">
            <FileSpreadsheet className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={clearFile} aria-label="Remove file">
              <X />
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-muted flex size-11 items-center justify-center rounded-full">
              <Upload className="text-muted-foreground size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Drag & drop your Tickertape CSV</p>
              <p className="text-muted-foreground mt-1 text-xs">or</p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          id={`${id}-file`}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {file ? "Choose a different CSV" : "Choose CSV"}
        </Button>
      </div>

      <div className="grid max-w-xs gap-2">
        <Label htmlFor={`${id}-date`}>Snapshot date</Label>
        <Input
          id={`${id}-date`}
          type="date"
          value={snapshotDate}
          onChange={(event) => {
            setSnapshotDate(event.target.value);
            setDateFromFileName(false);
          }}
          aria-describedby={`${id}-date-description`}
          suppressHydrationWarning
          required
        />
        <p id={`${id}-date-description`} className="text-muted-foreground text-xs" aria-live="polite">
          {dateDescription}
        </p>
      </div>

      <div>
        <Button type="submit" size="sm" disabled={!file || !snapshotDate || isPending}>
          {isPending ? "Checking file…" : "Preview import"}
        </Button>
      </div>
    </form>
  );
}
