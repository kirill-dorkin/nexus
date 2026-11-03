import Link from "next/link";
import type { StudioCourseList } from "@platform/contracts";
import { Badge, Heading, Text } from "@platform/ui";
import styles from "../../components/studio/studio.module.css";

/** Courses of one organization, each opening its editor; published ones also link to access. */
export function StudioCourseRows({
  organizationId,
  courses
}: {
  organizationId: string;
  courses: StudioCourseList["courses"];
}) {
  return (
    <ul className={styles.courseList}>
      {courses.map((c) => (
        <li key={c.courseId}>
          <Link
            className={styles.courseRow}
            href={`/studio/${organizationId}/${c.courseId}`}
          >
            <div>
              <div className={styles.courseMeta}>
                <Badge tone={c.status === "draft" ? "accent" : "neutral"}>
                  {c.status === "draft" ? "Черновик" : "Опубликовано"}
                </Badge>
                <Text muted size="sm">
                  Версия {c.versionNumber}
                </Text>
              </div>
              <Heading level={3} size="section">
                {c.title}
              </Heading>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
          {c.status === "published" && (
            <Link
              className={styles.courseManageLink}
              href={`/studio/${organizationId}/${c.courseId}/offerings`}
            >
              Доступ и ссылка
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
