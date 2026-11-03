import { notFound } from "next/navigation";
import { uuidSchema } from "@platform/contracts";
import { StudioShell } from "../../../../components/studio/studio-shell";
import { CustomerEntryManager } from "../../../../components/studio/customer-entry-manager";

export const metadata = {
  title: "Вступление учеников · Studio",
  robots: { index: false, follow: false }
};

export default async function Page({
  params
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  if (!uuidSchema.safeParse(organizationId).success) notFound();

  return (
    <StudioShell>
      <CustomerEntryManager
        key={organizationId}
        organizationId={organizationId}
      />
    </StudioShell>
  );
}
