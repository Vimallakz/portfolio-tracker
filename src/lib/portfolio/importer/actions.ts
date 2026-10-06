"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  cancelImport,
  confirmImport,
  ImportError,
  previewImport,
} from "@/lib/portfolio/importer/import-service";
import type { ImportConfirmation, ImportPreview } from "@/lib/portfolio/importer/preview";
import { requireActiveProfile } from "@/lib/profiles/profile-context";

export type ImportActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const ACCEPTED_MIME_TYPES = new Set(["", "text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]);

/** Allow a day of slack so a user east of UTC can import "today". */
const FUTURE_DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

const snapshotDateSchema = z.iso
  .date({ error: "Choose a valid snapshot date." })
  .refine(
    (value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now() + FUTURE_DATE_TOLERANCE_MS,
    "The snapshot date cannot be in the future.",
  );

const confirmSchema = z.object({
  sessionId: z.string().min(1).max(64),
  allowDuplicate: z.boolean(),
});

const GENERIC_ERROR = "The import failed. Nothing was saved. Please try again.";

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ImportError) {
    return { ok: false, error: error.message };
  }

  // Name and message only: never the CSV content or the full error object.
  console.error(
    "Portfolio import failed:",
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
  );

  return { ok: false, error: GENERIC_ERROR };
}

async function readCsvFile(file: FormDataEntryValue | null): Promise<{ name: string; text: string }> {
  if (!(file instanceof File) || file.size === 0) {
    throw new ImportError("Choose a CSV file to upload.");
  }

  if (!file.name.toLowerCase().endsWith(".csv") || !ACCEPTED_MIME_TYPES.has(file.type)) {
    throw new ImportError("Only .csv files can be imported.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new ImportError("The file is larger than 512 KB. A portfolio export should be far smaller.");
  }

  const text = await file.text();

  if (text.includes("\u0000")) {
    throw new ImportError("The file does not look like a text CSV.");
  }

  return { name: file.name.slice(0, MAX_FILE_NAME_LENGTH), text };
}

export async function previewPortfolioImport(
  formData: FormData,
): Promise<ImportActionResult<ImportPreview>> {
  try {
    const { profile } = await requireActiveProfile();

    const snapshotDate = snapshotDateSchema.safeParse(formData.get("snapshotDate"));

    if (!snapshotDate.success) {
      throw new ImportError(snapshotDate.error.issues[0]?.message ?? "Choose a valid snapshot date.");
    }

    const file = await readCsvFile(formData.get("file"));

    const preview = await previewImport({
      profile,
      fileName: file.name,
      csvText: file.text,
      snapshotDate: snapshotDate.data,
    });

    return { ok: true, data: preview };
  } catch (error) {
    return failure(error);
  }
}

export async function confirmPortfolioImport(
  input: unknown,
): Promise<ImportActionResult<ImportConfirmation>> {
  try {
    const parsed = confirmSchema.safeParse(input);

    if (!parsed.success) {
      throw new ImportError("Invalid import request.");
    }

    // The session must belong to the active profile, so switching profiles
    // mid-import cannot write one profile's CSV into another.
    const { profile } = await requireActiveProfile();

    const confirmation = await confirmImport({
      profileId: profile.id,
      sessionId: parsed.data.sessionId,
      allowDuplicate: parsed.data.allowDuplicate,
    });

    revalidatePath("/", "layout");

    return { ok: true, data: confirmation };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelPortfolioImport(sessionId: unknown): Promise<ImportActionResult<null>> {
  try {
    const parsed = z.string().min(1).max(64).safeParse(sessionId);

    if (!parsed.success) {
      throw new ImportError("Invalid import request.");
    }

    const { profile } = await requireActiveProfile();
    await cancelImport(profile.id, parsed.data);

    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
