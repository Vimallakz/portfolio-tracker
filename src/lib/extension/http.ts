import { getTokenUser, type TokenUser } from "@/lib/auth/api-token";
import type { ExtensionErrorResponse } from "@/lib/extension/contract";

/** Every answer is per-user, so nothing may be cached on the way. */
export function json<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const errorJson = (error: string, status: number) => json<ExtensionErrorResponse>({ error }, status);

/** Runs the handler for a valid Bearer token, otherwise answers 401 so the extension asks to sign in. */
export async function withTokenUser(
  request: Request,
  handler: (user: TokenUser) => Promise<Response>,
): Promise<Response> {
  const user = await getTokenUser(request);

  return user ? handler(user) : errorJson("Sign in again from the extension.", 401);
}
