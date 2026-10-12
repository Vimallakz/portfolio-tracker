import type { ExtensionProfilesResponse } from "@/lib/extension/contract";
import { json, withTokenUser } from "@/lib/extension/http";
import { listProfiles } from "@/lib/profiles/queries";

export async function GET(request: Request) {
  return withTokenUser(request, async ({ userId }) =>
    json<ExtensionProfilesResponse>({ profiles: await listProfiles(userId) }),
  );
}
