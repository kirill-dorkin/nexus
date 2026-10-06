import { notFound } from "next/navigation";
import { uuidSchema } from "@platform/contracts";
import { StudioShell } from "../../../../components/studio/studio-shell";
import { CourseEditor } from "../../../../components/studio/course-editor";
export const metadata = {
  title: "Редактор курса",
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
    (courseId !== "new" && !uuidSchema.safeParse(courseId).success)
  )
    notFound();
  return (
    <StudioShell>
      <CourseEditor
        key={`${organizationId}/${courseId}`}
        organizationId={organizationId}
        courseId={courseId}
      />
    </StudioShell>
  );
}
