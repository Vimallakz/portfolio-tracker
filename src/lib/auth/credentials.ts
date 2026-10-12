import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

export const INVALID_CREDENTIALS = "Email or password is incorrect.";

let dummyHash: Promise<string> | undefined;

/** The user's id when email and password match, else null. Email must already be normalised. */
export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });

  // Hash even for unknown emails, so response time does not reveal which emails have accounts.
  dummyHash ??= hashPassword("not-a-real-password");
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));

  return user && valid ? user.id : null;
}
