import type { NextRequest } from "next/server";

import type { ExtensionSecuritiesResponse } from "@/lib/extension/contract";
import { errorJson, json, withTokenUser } from "@/lib/extension/http";
import { listExtensionSecurities } from "@/lib/extension/queries";
import { findOwnedProfile } from "@/lib/profiles/queries";

/** The profile's held and researched securities with targets, status and signals. */
export async function GET(request: NextRequest) {
  return withTokenUser(request, async ({ userId }) => {
    const profileId = request.nextUrl.searchParams.get("profileId");
    const profile = profileId ? await findOwnedProfile(userId, profileId) : null;

    if (!profile) {
      return errorJson("Choose one of your profiles in the extension.", 404);
    }

    return json<ExtensionSecuritiesResponse>({
      profile,
      generatedAt: new Date().toISOString(),
      securities: await listExtensionSecurities(profile.id, request.nextUrl.origin),
    });
  });
}
