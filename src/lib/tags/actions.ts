"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { findProfileSecurity } from "@/lib/portfolio/securities/queries";
import { requireActiveProfile } from "@/lib/profiles/profile-context";
import { findProfileTag, findTagByName } from "@/lib/tags/queries";
import { tagFormSchema, type TagSummary } from "@/lib/tags/schema";

const idSchema = z.string().min(1).max(64);
const tagIdsSchema = z.array(idSchema).max(200);

export type CreateTagResult = { ok: true; tag: TagSummary } | { ok: false; error: string };

const duplicateName = (name: string) => ({ ok: false as const, error: `A tag named “${name}” already exists.` });

export async function createTag(input: unknown): Promise<CreateTagResult> {
  const parsed = tagFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const { profile } = await requireActiveProfile();
  const existing = await findTagByName(profile.id, parsed.data.name);

  if (existing) {
    return duplicateName(existing.name);
  }

  const tag = await prisma.tag.create({
    data: { profileId: profile.id, name: parsed.data.name },
    select: { id: true, name: true },
  });

  revalidatePath("/", "layout");

  return { ok: true, tag };
}

export async function renameTag(tagId: string, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(tagId);
  const parsed = tagFormSchema.safeParse(input);

  if (!id.success || !parsed.success) {
    return { ok: false, error: parsed.success ? "Invalid tag." : z.prettifyError(parsed.error) };
  }

  const { profile } = await requireActiveProfile();
  const tag = await findProfileTag(profile.id, id.data);

  if (!tag) {
    return { ok: false, error: "Tag not found." };
  }

  const clash = await findTagByName(profile.id, parsed.data.name, tag.id);

  if (clash) {
    return duplicateName(clash.name);
  }

  await prisma.tag.update({ where: { id: tag.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");

  return { ok: true };
}

/** Deleting a tag removes it from every security; the securities are untouched. */
export async function deleteTag(tagId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(tagId);

  if (!id.success) {
    return { ok: false, error: "Invalid tag." };
  }

  const { profile } = await requireActiveProfile();
  const tag = await findProfileTag(profile.id, id.data);

  if (!tag) {
    return { ok: false, error: "Tag not found." };
  }

  await prisma.tag.delete({ where: { id: tag.id } });
  revalidatePath("/", "layout");

  return { ok: true };
}

/**
 * Replaces the active profile's tags on a security with exactly tagIds. Other
 * profiles' tags on the same security are never touched.
 */
export async function setSecurityTags(securityId: string, tagIds: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(securityId);
  const ids = tagIdsSchema.safeParse(tagIds);

  if (!id.success || !ids.success) {
    return { ok: false, error: "Invalid request." };
  }

  const { profile } = await requireActiveProfile();
  const security = await findProfileSecurity(profile.id, id.data);

  if (!security) {
    return { ok: false, error: "Security not found." };
  }

  const owned = await prisma.tag.findMany({
    where: { profileId: profile.id, id: { in: ids.data } },
    select: { id: true },
  });

  if (owned.length !== new Set(ids.data).size) {
    return { ok: false, error: "One of the tags no longer exists. Refresh and try again." };
  }

  const ownedIds = owned.map((tag) => tag.id);

  await prisma.$transaction([
    prisma.securityTag.deleteMany({
      where: { securityId: security.id, tag: { profileId: profile.id }, tagId: { notIn: ownedIds } },
    }),
    prisma.securityTag.createMany({
      data: ownedIds.map((tagId) => ({ securityId: security.id, tagId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/", "layout");

  return { ok: true };
}
