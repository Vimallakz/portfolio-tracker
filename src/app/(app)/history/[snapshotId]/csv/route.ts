import type { NextRequest } from "next/server";

import { buildSnapshotCsv, snapshotCsvFileName } from "@/lib/portfolio/snapshots/csv-export";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export async function GET(_request: NextRequest, ctx: RouteContext<"/history/[snapshotId]/csv">) {
  const [{ snapshotId }, { activeProfile }] = await Promise.all([ctx.params, getProfileContext()]);
  const snapshot = activeProfile
    ? (await listProfileSnapshots(activeProfile.id)).find((s) => s.id === snapshotId)
    : undefined;

  if (!activeProfile || !snapshot) {
    return new Response("Snapshot not found.", { status: 404 });
  }

  const fileName = snapshotCsvFileName(activeProfile.name, snapshot.snapshotDate);

  return new Response(buildSnapshotCsv(snapshot.holdings), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
