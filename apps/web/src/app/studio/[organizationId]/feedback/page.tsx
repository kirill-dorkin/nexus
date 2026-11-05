import { notFound } from "next/navigation";
import { uuidSchema } from "@platform/contracts";
import { StudioShell } from "../../../../components/studio/studio-shell";
import { FeedbackInbox } from "../../../../components/studio/feedback-inbox";

export const metadata = {
  title: "Отзывы учеников · Studio",
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
      <FeedbackInbox key={organizationId} organizationId={organizationId} />
    </StudioShell>
  );
}
