"use client";
import type { CourseManifestV1 } from "@platform/contracts";
import styles from "../studio.module.css";
import { TextField, type Edit } from "./controls";

export function CourseSection({
  course,
  existing,
  edit
}: {
  course: CourseManifestV1["course"];
  existing: boolean;
  edit: Edit;
}) {
  return (
    <section className={styles.card} id="studio-course" aria-label="Курс">
      <h2>Курс</h2>
      <TextField
        label="Адрес курса (slug)"
        value={course.slug}
        readOnly={existing}
        maxLength={63}
        onChange={(v) =>
          edit((d) => {
            d.course.slug = v;
          })
        }
      />
      <TextField
        label="Название курса"
        value={course.title}
        maxLength={200}
        onChange={(v) =>
          edit((d) => {
            d.course.title = v;
          })
        }
      />
      <TextField
        label="Описание курса"
        multiline
        value={course.description}
        maxLength={5000}
        onChange={(v) =>
          edit((d) => {
            d.course.description = v;
          })
        }
      />
    </section>
  );
}
