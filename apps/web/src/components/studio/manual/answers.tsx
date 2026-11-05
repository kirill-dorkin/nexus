"use client";
import type { ManifestActivity } from "@platform/contracts";
import { Button, Input } from "@platform/ui";
import { itemAt } from "../../../lib/item-at";
import { move } from "../editor-model";
import {
  addOption,
  removeOption,
  renameOption,
  setCorrectOption
} from "../editor-commands";
import styles from "../studio.module.css";
import { Order, TextField, type Edit } from "./controls";

type ShortText = Extract<ManifestActivity, { type: "quiz.short_text" }>;
type Choice = Extract<
  ManifestActivity,
  { type: "quiz.single_choice" | "quiz.multiple_choice" }
>;

/** Accepted answers and case sensitivity of a short-text question. */
export function ShortTextAnswers({
  activity,
  index: i,
  edit
}: {
  activity: ShortText;
  index: number;
  edit: Edit;
}) {
  const answers = (change: (a: ShortText) => void) =>
    edit((d) => {
      const a = itemAt(d.activities, i);
      if (a.type === "quiz.short_text") change(a);
    });
  return (
    <>
      <fieldset>
        <legend>Допустимые ответы</legend>
        {activity.validation.acceptedAnswers.map((answer, j) => (
          <div key={j}>
            <TextField
              label={`Допустимый ответ ${j + 1}`}
              value={answer}
              maxLength={2000}
              onChange={(v) =>
                answers((a) => {
                  a.validation.acceptedAnswers[j] = v;
                })
              }
            />
            <Order
              label={`Ответ ${j + 1}`}
              index={j}
              count={activity.validation.acceptedAnswers.length}
              onMove={(o) =>
                answers((a) => move(a.validation.acceptedAnswers, j, o))
              }
              onRemove={() =>
                answers((a) => {
                  a.validation.acceptedAnswers.splice(j, 1);
                })
              }
            />
          </div>
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            answers((a) => {
              a.validation.acceptedAnswers.push("");
            })
          }
        >
          Добавить допустимый ответ
        </Button>
      </fieldset>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={activity.validation.caseSensitive}
          onChange={(e) =>
            answers((a) => {
              a.validation.caseSensitive = e.target.checked;
            })
          }
        />
        Учитывать регистр
      </label>
    </>
  );
}

/** Options of a single- or multiple-choice question and which are correct. */
export function ChoiceOptions({
  activity,
  index: i,
  edit
}: {
  activity: Choice;
  index: number;
  edit: Edit;
}) {
  const single = activity.type === "quiz.single_choice";
  return (
    <>
      {activity.presentation.options.map((option, j) => (
        <fieldset key={j}>
          <legend>Вариант {j + 1}</legend>
          <TextField
            label="Ключ варианта"
            value={option.id}
            maxLength={63}
            onChange={(v) => edit((d) => renameOption(d, i, j, v))}
          />
          <TextField
            label="Текст варианта"
            multiline
            value={option.text}
            maxLength={2000}
            onChange={(v) =>
              edit((d) => {
                const a = itemAt(d.activities, i);
                if (
                  a.type === "quiz.single_choice" ||
                  a.type === "quiz.multiple_choice"
                )
                  itemAt(a.presentation.options, j).text = v;
              })
            }
          />
          <label className={styles.check}>
            <Input
              type={single ? "radio" : "checkbox"}
              name={`correct-${i}`}
              checked={
                activity.type === "quiz.single_choice"
                  ? activity.validation.correctOptionId === option.id
                  : activity.validation.correctOptionIds.includes(option.id)
              }
              onChange={(e) =>
                edit((d) => setCorrectOption(d, i, option.id, e.target.checked))
              }
            />
            Правильный вариант {j + 1}
          </label>
          <Order
            label={`Вариант ${j + 1}`}
            index={j}
            count={activity.presentation.options.length}
            onMove={(o) =>
              edit((d) => {
                const a = itemAt(d.activities, i);
                if (
                  a.type === "quiz.single_choice" ||
                  a.type === "quiz.multiple_choice"
                )
                  move(a.presentation.options, j, o);
              })
            }
            onRemove={() => edit((d) => removeOption(d, i, j))}
          />
        </fieldset>
      ))}
      <Button
        variant="secondary"
        type="button"
        onClick={() => edit((d) => addOption(d, i))}
      >
        Добавить вариант
      </Button>
    </>
  );
}
