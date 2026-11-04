"use client";
import type {
  CourseManifestV1,
  ManifestActivity,
  ManifestAssignmentActivity,
  ManifestQuizActivity
} from "@platform/contracts";
import { Select } from "@platform/ui";
import { itemAt } from "../../../lib/item-at";
import { move } from "../editor-model";
import {
  changeActivityType,
  quizAt,
  renameActivity,
  setActivitySkill
} from "../editor-commands";
import styles from "../studio.module.css";
import { ChoiceOptions, ShortTextAnswers } from "./answers";
import { Order, TextField, type Edit } from "./controls";

export function ActivityEditor({
  activity,
  index: i,
  count,
  skills,
  edit
}: {
  activity: ManifestActivity;
  index: number;
  count: number;
  skills: CourseManifestV1["skills"];
  edit: Edit;
}) {
  if (activity.type === "assignment.files")
    return (
      <AssignmentSummary
        activity={activity}
        index={i}
        count={count}
        edit={edit}
      />
    );
  return (
    <fieldset>
      <legend>Задание {i + 1}</legend>
      <TextField
        label="Адрес задания (slug)"
        value={activity.slug}
        maxLength={63}
        onChange={(v) => edit((d) => renameActivity(d, i, v))}
      />
      <TextField
        label="Название задания"
        value={activity.title}
        maxLength={200}
        onChange={(v) =>
          edit((d) => {
            itemAt(d.activities, i).title = v;
          })
        }
      />
      <TextField
        label="Инструкция (Markdown)"
        multiline
        value={activity.instructions}
        maxLength={20000}
        onChange={(v) =>
          edit((d) => {
            itemAt(d.activities, i).instructions = v;
          })
        }
      />
      <label>
        Тип задания
        <Select
          value={activity.type}
          onChange={(e) =>
            edit((d) =>
              changeActivityType(
                d,
                i,
                e.target.value as ManifestQuizActivity["type"]
              )
            )
          }
        >
          <option value="quiz.single_choice">Один правильный вариант</option>
          <option value="quiz.multiple_choice">
            Несколько правильных вариантов
          </option>
          <option value="quiz.short_text">Короткий текст</option>
        </Select>
      </label>
      <fieldset>
        <legend>Навыки задания</legend>
        {skills.map((s, k) => (
          <label className={styles.check} key={k}>
            <input
              type="checkbox"
              checked={activity.skillKeys.includes(s.key)}
              onChange={(e) =>
                edit((d) => setActivitySkill(d, i, s.key, e.target.checked))
              }
            />
            {s.title || s.key || `Навык ${k + 1}`}
          </label>
        ))}
      </fieldset>
      <TextField
        label="Вопрос (Markdown)"
        multiline
        value={activity.presentation.question}
        maxLength={20000}
        onChange={(v) =>
          edit((d) => {
            const quiz = quizAt(d.activities, i);
            if (quiz) quiz.presentation.question = v;
          })
        }
      />
      {activity.type === "quiz.short_text" ? (
        <ShortTextAnswers activity={activity} index={i} edit={edit} />
      ) : (
        <ChoiceOptions activity={activity} index={i} edit={edit} />
      )}
      <TextField
        label="Объяснение автора"
        multiline
        value={activity.validation.explanation}
        maxLength={10000}
        onChange={(v) =>
          edit((d) => {
            const quiz = quizAt(d.activities, i);
            if (quiz) quiz.validation.explanation = v;
          })
        }
      />
      <Order
        label={`Задание ${i + 1}`}
        index={i}
        count={count}
        onMove={(o) => edit((d) => move(d.activities, i, o))}
        onRemove={() =>
          edit((d) => {
            d.activities.splice(i, 1);
          })
        }
      />
    </fieldset>
  );
}

/** File assignments (ADR-0073) are edited in the JSON tab; here they are listed and ordered. */
function AssignmentSummary({
  activity,
  index: i,
  count,
  edit
}: {
  activity: ManifestAssignmentActivity;
  index: number;
  count: number;
  edit: Edit;
}) {
  return (
    <fieldset>
      <legend>Задание {i + 1}</legend>
      <p>
        <strong>{activity.title || activity.slug}</strong> — задание с файлами:{" "}
        {Object.keys(activity.presentation.starterFiles).length} файл(ов) в
        заготовке, {activity.validation.checks.length} проверок. Оно
        редактируется во вкладке JSON.
      </p>
      <Order
        label={`Задание ${i + 1}`}
        index={i}
        count={count}
        onMove={(o) => edit((d) => move(d.activities, i, o))}
        onRemove={() =>
          edit((d) => {
            d.activities.splice(i, 1);
          })
        }
      />
    </fieldset>
  );
}
