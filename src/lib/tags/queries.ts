import { prisma } from "@/lib/db/prisma";
import type { TagSummary } from "@/lib/tags/schema";

export type TagWithUsage = TagSummary & { securityCount: number };

export async function listTags(profileId: string): Promise<TagSummary[]> {
  return prisma.tag.findMany({
    where: { profileId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listTagsWithUsage(profileId: string): Promise<TagWithUsage[]> {
  const tags = await prisma.tag.findMany({
    where: { profileId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { securities: true } } },
  });

  return tags.map(({ _count, ...tag }) => ({ ...tag, securityCount: _count.securities }));
}

/** Resolves a tag only if it belongs to profileId. */
export async function findProfileTag(profileId: string, tagId: string): Promise<TagSummary | null> {
  return prisma.tag.findFirst({
    where: { id: tagId, profileId },
    select: { id: true, name: true },
  });
}

/** Case-insensitive, so "AI" and "ai" cannot both exist in one profile. */
export async function findTagByName(
  profileId: string,
  name: string,
  excludeTagId?: string,
): Promise<TagSummary | null> {
  return prisma.tag.findFirst({
    where: {
      profileId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeTagId ? { id: { not: excludeTagId } } : {}),
    },
    select: { id: true, name: true },
  });
}
