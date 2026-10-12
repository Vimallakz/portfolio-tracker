"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/result";
import { INVALID_CREDENTIALS, verifyCredentials } from "@/lib/auth/credentials";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordFormSchema, loginFormSchema, safeRedirectPath, signupFormSchema } from "@/lib/auth/schema";
import { createSession, deleteOtherSessions, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function login(input: unknown, next?: unknown): Promise<ActionResult> {
  const parsed = loginFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const userId = await verifyCredentials(parsed.data.email, parsed.data.password);

  if (!userId) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  await createSession(userId);
  redirect(safeRedirectPath(next));
}

export async function signup(input: unknown): Promise<ActionResult> {
  const parsed = signupFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const { name, email, password } = parsed.data;
  let userId: string;

  try {
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "An account with this email already exists. Log in instead." };
    }
    throw error;
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const { id } = await getCurrentUser();
  const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id }, select: { passwordHash: true } });

  if (!(await verifyPassword(parsed.data.currentPassword, passwordHash))) {
    return { ok: false, error: "Your current password is incorrect." };
  }

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  await deleteOtherSessions(id);

  return { ok: true };
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
