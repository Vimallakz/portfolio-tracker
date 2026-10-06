import { notFound } from "next/navigation";

import { ResearchForm } from "@/components/research/research-form";
import { PageHeader } from "@/components/shared/page-header";
import { getSecurityDetail } from "@/lib/portfolio/securities/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";
import { toResearchFormValues } from "@/lib/research/schema";

export const metadata = { title: "Edit research | Portfolio Intelligence" };

export default async function SecurityResearchPage({ params }: { params: Promise<{ securityId: string }> }) {
  const [{ securityId }, { activeProfile }] = await Promise.all([params, getProfileContext()]);
  const detail = activeProfile ? await getSecurityDetail(activeProfile.id, securityId) : null;

  if (!detail || !activeProfile) {
    notFound();
  }

  const { security, research } = detail;

  return (
    <>
      <PageHeader
        title={`${research ? "Edit" : "Add"} research: ${security.ticker ?? security.name}`}
        description={`${security.name} · visible only to ${activeProfile.name}. Every field is optional.`}
      />
      <ResearchForm securityId={security.id} defaultValues={toResearchFormValues(research)} />
    </>
  );
}
