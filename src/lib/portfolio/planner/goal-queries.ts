import { prisma } from "@/lib/db/prisma";
import type { InvestmentGoal } from "@/lib/portfolio/planner/goal";

/** The profile's goal, or null when none is set. The target month is stored as its first day. */
export async function getGoal(profileId: string): Promise<InvestmentGoal | null> {
  const goal = await prisma.investmentGoal.findUnique({
    where: { profileId },
    select: { name: true, targetAmount: true, targetDate: true, inflationRate: true },
  });

  if (!goal) return null;

  return {
    name: goal.name,
    targetAmount: goal.targetAmount.toNumber(),
    targetMonth: goal.targetDate.toISOString().slice(0, 7),
    inflationRate: goal.inflationRate?.toNumber() ?? null,
  };
}
