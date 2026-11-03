"use client";
import type { CourseManifestV1 } from "@platform/contracts";
import { Button } from "@platform/ui";
import { addActivity } from "./editor-commands";
import { ActivityEditor } from "./manual/activity-editor";
import type { Edit } from "./manual/controls";
import { CourseSection } from "./manual/course-section";
import { LessonsSection } from "./manual/lessons-section";
import { SkillsSection } from "./manual/skills-section";
import styles from "./studio.module.css";

export type { Edit } from "./manual/controls";

/** Form editor over the course manifest: every change goes through `edit`. */
export function ManualEditor({
  document,
  edit,
  existing
}: {
  document: CourseManifestV1;
  edit: Edit;
  existing: boolean;
}) {
  return (
    <div className={styles.sections}>
      <CourseSection course={document.course} existing={existing} edit={edit} />
      <SkillsSection skills={document.skills} edit={edit} />
      <section
        className={styles.card}
        id="studio-activities"
        aria-label="Задания"
      >
        <h2>Задания</h2>
        {document.activities.map((activity, i) => (
          <ActivityEditor
            key={i}
            activity={activity}
            index={i}
            count={document.activities.length}
            skills={document.skills}
            edit={edit}
          />
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() => edit(addActivity)}
        >
          Добавить задание
        </Button>
      </section>
      <LessonsSection document={document} edit={edit} />
    </div>
  );
}
