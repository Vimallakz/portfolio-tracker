import { revokeApiToken } from "@/lib/auth/api-token";
import { json, withTokenUser } from "@/lib/extension/http";

/** Revokes the calling token, so signing out of the extension also removes it from Settings. */
export async function POST(request: Request) {
  return withTokenUser(request, async ({ userId, tokenId }) => {
    await revokeApiToken(userId, tokenId);
    return json({ ok: true });
  });
}
