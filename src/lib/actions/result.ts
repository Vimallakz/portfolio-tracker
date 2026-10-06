/** What every mutating server action returns: a message instead of a throw. */
export type ActionResult = { ok: true } | { ok: false; error: string };
