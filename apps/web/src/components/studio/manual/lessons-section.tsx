"use client";
import type { CourseManifestV1, ManifestLesson } from "@platform/contracts";
import { Button, Input } from "@platform/ui";
import { itemAt } from "../../../lib/item-at";
import { move } from "../editor-model";
import { addBlock, addLesson, setChapter } from "../editor-commands";
import styles from "../studio.module.css";
import { BlockEditor } from "./block-editor";
import { Order, TextField, type Edit } from "./controls";

function LessonEditor({
  lesson,
  index: i,
  count,
  activities,
  edit
}: {
  lesson: ManifestLesson;
  index: number;
  count: number;
  activities: CourseManifestV1["activities"];
  edit: Edit;
}) {
  return (
    <fieldset>
      <legend>Урок {i + 1}</legend>
      <TextField
        label="Адрес урока (slug)"
        value={lesson.slug}
        maxLength={63}
        onChange={(v) =>
          edit((d) => {
            itemAt(d.lessons, i).slug = v;
          })
        }
      />
      <TextField
        label="Название урока"
        value={lesson.title}
        maxLength={200}
        onChange={(v) =>
          edit((d) => {
            itemAt(d.lessons, i).title = v;
          })
        }
      />
      <TextField
        label="Краткое описание урока"
        multiline
        value={lesson.summary}
        maxLength={5000}
        onChange={(v) =>
          edit((d) => {
            itemAt(d.lessons, i).summary = v;
          })
        }
      />
      <label>
        Глава (необязательно)
        <Input
          value={lesson.chapter ?? ""}
          maxLength={80}
          placeholder="Например: Формы"
          onChange={(e) => edit((d) => setChapter(d, i, e.target.value))}
        />
      </label>
      <label>
        Длительность, минут
        <Input
          type="number"
          min={1}
          max={1440}
          value={lesson.durationMinutes}
          onChange={(e) =>
            edit((d) => {
              itemAt(d.lessons, i).durationMinutes = Number(e.target.value);
            })
          }
        />
      </label>
      {lesson.blocks.map((block, j) => (
        <BlockEditor
          key={j}
          block={block}
          lesson={i}
          index={j}
          count={lesson.blocks.length}
          activities={activities}
          edit={edit}
        />
      ))}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          type="button"
          onClick={() => edit((d) => addBlock(d, i, "youtube"))}
        >
          Добавить видео
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => edit((d) => addBlock(d, i, "markdown"))}
        >
          Добавить конспект
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => edit((d) => addBlock(d, i, "activity"))}
        >
          Добавить практику
        </Button>
      </div>
      <Order
        label={`Урок ${i + 1}`}
        index={i}
        count={count}
        onMove={(o) => edit((d) => move(d.lessons, i, o))}
        onRemove={() =>
          edit((d) => {
            d.lessons.splice(i, 1);
          })
        }
      />
    </fieldset>
  );
}

export function LessonsSection({
  document,
  edit
}: {
  document: CourseManifestV1;
  edit: Edit;
}) {
  return (
    <section className={styles.card} id="studio-lessons" aria-label="Уроки">
      <h2>Уроки</h2>
      {document.lessons.map((lesson, i) => (
        <LessonEditor
          key={i}
          lesson={lesson}
          index={i}
          count={document.lessons.length}
          activities={document.activities}
          edit={edit}
        />
      ))}
      <Button variant="secondary" type="button" onClick={() => edit(addLesson)}>
        Добавить урок
      </Button>
    </section>
  );
}
