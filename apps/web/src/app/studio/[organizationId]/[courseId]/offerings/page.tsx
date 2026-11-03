import { notFound } from "next/navigation";
import { uuidSchema } from "@platform/contracts";
import { StudioShell } from "../../../../../components/studio/studio-shell";
import { OfferingManager } from "../../../../../components/studio/offering-manager";

export const metadata = {
  title: "Доступ к курсу · Studio",
  robots: { index: false, follow: false }
};

export default async function Page({
  params
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId, courseId } = await params;
  if (
    !uuidSchema.safeParse(organizationId).success ||
    !uuidSchema.safeParse(courseId).success
  )
    notFound();

  return (
    <StudioShell>
      <OfferingManager
        key={`${organizationId}/${courseId}`}
        organizationId={organizationId}
        courseId={courseId}
      />
    </StudioShell>
  );
}
