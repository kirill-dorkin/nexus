"use client";
import { useId } from "react";
import type { CourseManifestV1, ManifestActivity } from "@platform/contracts";
import { move, newActivity } from "./editor-model";
import {
  Button,
  Field as ControlField,
  IconButton,
  Input,
  Select,
  Textarea
} from "@platform/ui";
import styles from "./studio.module.css";
type Edit = (change: (document: CourseManifestV1) => void) => void;
function Field({
  label,
  value,
  onChange,
  multiline = false,
  readOnly = false,
  maxLength = 50000,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <ControlField htmlFor={id} label={label} hint={hint}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
          rows={4}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
        />
      )}
    </ControlField>
  );
}
function Order({
  label,
  index,
  count,
  onMove,
  onRemove
}: {
  label: string;
  index: number;
  count: number;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.orderActions}>
      <IconButton
        type="button"
        aria-label={`${label}: вверх`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </IconButton>
      <IconButton
        type="button"
        aria-label={`${label}: вниз`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </IconButton>
      <Button
        variant="ghost"
        className={styles.remove}
        type="button"
        onClick={onRemove}
      >
        Удалить {label.toLowerCase()}
      </Button>
    </div>
  );
}
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
      <section className={styles.card} id="studio-course" aria-label="Курс">
        <h2>Курс</h2>
        <Field
          label="Адрес курса (slug)"
          value={document.course.slug}
          readOnly={existing}
          maxLength={63}
          onChange={(v) =>
            edit((d) => {
              d.course.slug = v;
            })
          }
        />
        <Field
          label="Название курса"
          value={document.course.title}
          maxLength={200}
          onChange={(v) =>
            edit((d) => {
              d.course.title = v;
            })
          }
        />
        <Field
          label="Описание курса"
          multiline
          value={document.course.description}
          maxLength={5000}
          onChange={(v) =>
            edit((d) => {
              d.course.description = v;
            })
          }
        />
      </section>
      <section className={styles.card} id="studio-skills" aria-label="Навыки">
        <h2>Навыки</h2>
        <p>Ключи связывают задания с навыками курса.</p>
        {document.skills.map((skill, i) => (
          <fieldset key={i}>
            <legend>Навык {i + 1}</legend>
            <Field
              label="Ключ навыка"
              value={skill.key}
              maxLength={63}
              onChange={(v) =>
                edit((d) => {
                  const old = d.skills[i]!.key;
                  d.skills[i]!.key = v;
                  d.activities.forEach((a) => {
                    a.skillKeys = a.skillKeys.map((k) => (k === old ? v : k));
                  });
                })
              }
            />
            <Field
              label="Название навыка"
              value={skill.title}
              maxLength={200}
              onChange={(v) =>
                edit((d) => {
                  d.skills[i]!.title = v;
                })
              }
            />
            <Field
              label="Описание навыка"
              multiline
              value={skill.description}
              maxLength={5000}
              onChange={(v) =>
                edit((d) => {
                  d.skills[i]!.description = v;
                })
              }
            />
            <Order
              label={`Навык ${i + 1}`}
              index={i}
              count={document.skills.length}
              onMove={(o) => edit((d) => move(d.skills, i, o))}
              onRemove={() =>
                edit((d) => {
                  d.skills.splice(i, 1);
                })
              }
            />
          </fieldset>
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            edit((d) => {
              d.skills.push({ key: "", title: "", description: "" });
            })
          }
        >
          Добавить навык
        </Button>
      </section>
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
            document={document}
            edit={edit}
          />
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            edit((d) => {
              d.activities.push(
                newActivity(
                  "quiz.single_choice",
                  "",
                  d.skills[0] ? [d.skills[0].key] : []
                )
              );
            })
          }
        >
          Добавить задание
        </Button>
      </section>
      <section className={styles.card} id="studio-lessons" aria-label="Уроки">
        <h2>Уроки</h2>
        {document.lessons.map((lesson, i) => (
          <fieldset key={i}>
            <legend>Урок {i + 1}</legend>
            <Field
              label="Адрес урока (slug)"
              value={lesson.slug}
              maxLength={63}
              onChange={(v) =>
                edit((d) => {
                  d.lessons[i]!.slug = v;
                })
              }
            />
            <Field
              label="Название урока"
              value={lesson.title}
              maxLength={200}
              onChange={(v) =>
                edit((d) => {
                  d.lessons[i]!.title = v;
                })
              }
            />
            <Field
              label="Краткое описание урока"
              multiline
              value={lesson.summary}
              maxLength={5000}
              onChange={(v) =>
                edit((d) => {
                  d.lessons[i]!.summary = v;
                })
              }
            />
            <label>
              Глава (необязательно)
              <Input
                value={lesson.chapter ?? ""}
                maxLength={80}
                placeholder="Например: Формы"
                onChange={(e) =>
                  edit((d) => {
                    const value = e.target.value;
                    if (value.trim()) d.lessons[i]!.chapter = value;
                    else delete d.lessons[i]!.chapter;
                  })
                }
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
                    d.lessons[i]!.durationMinutes = Number(e.target.value);
                  })
                }
              />
            </label>
            {lesson.blocks.map((block, j) => (
              <fieldset key={j}>
                <legend>
                  Блок {j + 1}:{" "}
                  {block.type === "youtube"
                    ? "Видео"
                    : block.type === "markdown"
                      ? "Конспект"
                      : "Задание"}
                </legend>
                {block.type === "youtube" && (
                  <Field
                    label="YouTube URL или ID"
                    hint="Вставьте ссылку youtube.com или youtu.be. Плеер загрузится только по нажатию ученика; при недоступности останется ссылка на YouTube."
                    value={block.videoId}
                    maxLength={2048}
                    onChange={(v) =>
                      edit((d) => {
                        const b = d.lessons[i]!.blocks[j]!;
                        if (b.type === "youtube") b.videoId = v;
                      })
                    }
                  />
                )}
                {block.type === "markdown" && (
                  <Field
                    label="Конспект (Markdown)"
                    hint="Заголовки ##, списки, **выделение**, цитаты > и блоки кода ``` сохраняют структуру текста. Проверьте оформление во вкладке «Предпросмотр». HTML и внешние изображения отключены."
                    multiline
                    value={block.markdown}
                    onChange={(v) =>
                      edit((d) => {
                        const b = d.lessons[i]!.blocks[j]!;
                        if (b.type === "markdown") b.markdown = v;
                      })
                    }
                  />
                )}
                {block.type === "activity" && (
                  <>
                    <label>
                      Задание урока
                      <Select
                        value={block.activitySlug}
                        onChange={(e) =>
                          edit((d) => {
                            const b = d.lessons[i]!.blocks[j]!;
                            if (b.type === "activity")
                              b.activitySlug = e.target.value;
                          })
                        }
                      >
                        <option value="">Выберите задание</option>
                        {document.activities.map((a, k) => (
                          <option key={k} value={a.slug}>
                            {a.title || a.slug || `Задание ${k + 1}`}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <Field
                      label="Заголовок блока (необязательно)"
                      value={block.title ?? ""}
                      maxLength={200}
                      onChange={(v) =>
                        edit((d) => {
                          const b = d.lessons[i]!.blocks[j]!;
                          if (b.type === "activity") {
                            if (v) b.title = v;
                            else delete b.title;
                          }
                        })
                      }
                    />
                    <label>
                      Вид задания
                      <Select
                        value={block.kind}
                        onChange={(e) =>
                          edit((d) => {
                            const b = d.lessons[i]!.blocks[j]!;
                            if (b.type === "activity")
                              b.kind = e.target.value as
                                | "practice"
                                | "homework";
                          })
                        }
                      >
                        <option value="practice">Практика</option>
                        <option value="homework">Домашнее задание</option>
                      </Select>
                    </label>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={block.required}
                        onChange={(e) =>
                          edit((d) => {
                            const b = d.lessons[i]!.blocks[j]!;
                            if (b.type === "activity")
                              b.required = e.target.checked;
                          })
                        }
                      />
                      Обязательное задание
                    </label>
                  </>
                )}
                <Order
                  label={`Блок ${j + 1}`}
                  index={j}
                  count={lesson.blocks.length}
                  onMove={(o) => edit((d) => move(d.lessons[i]!.blocks, j, o))}
                  onRemove={() =>
                    edit((d) => {
                      d.lessons[i]!.blocks.splice(j, 1);
                    })
                  }
                />
              </fieldset>
            ))}
            <div className={styles.actions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  edit((d) => {
                    d.lessons[i]!.blocks.push({ type: "youtube", videoId: "" });
                  })
                }
              >
                Добавить видео
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  edit((d) => {
                    d.lessons[i]!.blocks.push({
                      type: "markdown",
                      markdown: ""
                    });
                  })
                }
              >
                Добавить конспект
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  edit((d) => {
                    d.lessons[i]!.blocks.push({
                      type: "activity",
                      activitySlug: d.activities[0]?.slug ?? "",
                      kind: "practice",
                      required: true
                    });
                  })
                }
              >
                Добавить практику
              </Button>
            </div>
            <Order
              label={`Урок ${i + 1}`}
              index={i}
              count={document.lessons.length}
              onMove={(o) => edit((d) => move(d.lessons, i, o))}
              onRemove={() =>
                edit((d) => {
                  d.lessons.splice(i, 1);
                })
              }
            />
          </fieldset>
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            edit((d) => {
              d.lessons.push({
                slug: "",
                title: "",
                summary: "",
                durationMinutes: 10,
                blocks: []
              });
            })
          }
        >
          Добавить урок
        </Button>
      </section>
    </div>
  );
}
function ActivityEditor({
  activity,
  index: i,
  document,
  edit
}: {
  activity: ManifestActivity;
  index: number;
  document: CourseManifestV1;
  edit: Edit;
}) {
  return (
    <fieldset>
      <legend>Задание {i + 1}</legend>
      <Field
        label="Адрес задания (slug)"
        value={activity.slug}
        maxLength={63}
        onChange={(v) =>
          edit((d) => {
            const old = d.activities[i]!.slug;
            d.activities[i]!.slug = v;
            d.lessons.forEach((l) =>
              l.blocks.forEach((b) => {
                if (b.type === "activity" && b.activitySlug === old)
                  b.activitySlug = v;
              })
            );
          })
        }
      />
      <Field
        label="Название задания"
        value={activity.title}
        maxLength={200}
        onChange={(v) =>
          edit((d) => {
            d.activities[i]!.title = v;
          })
        }
      />
      <Field
        label="Инструкция (Markdown)"
        multiline
        value={activity.instructions}
        maxLength={20000}
        onChange={(v) =>
          edit((d) => {
            d.activities[i]!.instructions = v;
          })
        }
      />
      <label>
        Тип задания
        <Select
          value={activity.type}
          onChange={(e) =>
            edit((d) => {
              const old = d.activities[i]!;
              const next = newActivity(
                e.target.value as ManifestActivity["type"],
                old.slug,
                old.skillKeys
              );
              next.title = old.title;
              next.instructions = old.instructions;
              if (
                old.type !== "quiz.short_text" &&
                next.type !== "quiz.short_text"
              ) {
                next.presentation = structuredClone(old.presentation);
                if (next.type === "quiz.single_choice")
                  next.validation.correctOptionId =
                    old.type === "quiz.single_choice"
                      ? old.validation.correctOptionId
                      : (old.validation.correctOptionIds[0] ??
                        old.presentation.options[0]?.id ??
                        "");
                else
                  next.validation.correctOptionIds =
                    old.type === "quiz.multiple_choice"
                      ? [...old.validation.correctOptionIds]
                      : [old.validation.correctOptionId];
              }
              next.presentation.question = old.presentation.question;
              next.validation.explanation = old.validation.explanation;
              d.activities[i] = next;
            })
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
        {document.skills.map((s, k) => (
          <label className={styles.check} key={k}>
            <input
              type="checkbox"
              checked={activity.skillKeys.includes(s.key)}
              onChange={(e) =>
                edit((d) => {
                  const a = d.activities[i]!;
                  a.skillKeys = e.target.checked
                    ? [...a.skillKeys, s.key]
                    : a.skillKeys.filter((v) => v !== s.key);
                })
              }
            />
            {s.title || s.key || `Навык ${k + 1}`}
          </label>
        ))}
      </fieldset>
      <Field
        label="Вопрос (Markdown)"
        multiline
        value={activity.presentation.question}
        maxLength={20000}
        onChange={(v) =>
          edit((d) => {
            d.activities[i]!.presentation.question = v;
          })
        }
      />
      {activity.type === "quiz.short_text" ? (
        <>
          <fieldset>
            <legend>Допустимые ответы</legend>
            {activity.validation.acceptedAnswers.map((answer, j) => (
              <div key={j}>
                <Field
                  label={`Допустимый ответ ${j + 1}`}
                  value={answer}
                  maxLength={2000}
                  onChange={(v) =>
                    edit((d) => {
                      const a = d.activities[i]!;
                      if (a.type === "quiz.short_text")
                        a.validation.acceptedAnswers[j] = v;
                    })
                  }
                />
                <Order
                  label={`Ответ ${j + 1}`}
                  index={j}
                  count={activity.validation.acceptedAnswers.length}
                  onMove={(o) =>
                    edit((d) => {
                      const a = d.activities[i]!;
                      if (a.type === "quiz.short_text")
                        move(a.validation.acceptedAnswers, j, o);
                    })
                  }
                  onRemove={() =>
                    edit((d) => {
                      const a = d.activities[i]!;
                      if (a.type === "quiz.short_text")
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
                edit((d) => {
                  const a = d.activities[i]!;
                  if (a.type === "quiz.short_text")
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
                edit((d) => {
                  const a = d.activities[i]!;
                  if (a.type === "quiz.short_text")
                    a.validation.caseSensitive = e.target.checked;
                })
              }
            />
            Учитывать регистр
          </label>
        </>
      ) : (
        <>
          {activity.presentation.options.map((option, j) => (
            <fieldset key={j}>
              <legend>Вариант {j + 1}</legend>
              <Field
                label="Ключ варианта"
                value={option.id}
                maxLength={63}
                onChange={(v) =>
                  edit((d) => {
                    const a = d.activities[i]!;
                    if (a.type === "quiz.short_text") return;
                    const old = a.presentation.options[j]!.id;
                    a.presentation.options[j]!.id = v;
                    if (
                      a.type === "quiz.single_choice" &&
                      a.validation.correctOptionId === old
                    )
                      a.validation.correctOptionId = v;
                    else if (a.type === "quiz.multiple_choice")
                      a.validation.correctOptionIds =
                        a.validation.correctOptionIds.map((k) =>
                          k === old ? v : k
                        );
                  })
                }
              />
              <Field
                label="Текст варианта"
                multiline
                value={option.text}
                maxLength={2000}
                onChange={(v) =>
                  edit((d) => {
                    const a = d.activities[i]!;
                    if (a.type !== "quiz.short_text")
                      a.presentation.options[j]!.text = v;
                  })
                }
              />
              <label className={styles.check}>
                <Input
                  type={
                    activity.type === "quiz.single_choice"
                      ? "radio"
                      : "checkbox"
                  }
                  name={`correct-${i}`}
                  checked={
                    activity.type === "quiz.single_choice"
                      ? activity.validation.correctOptionId === option.id
                      : activity.validation.correctOptionIds.includes(option.id)
                  }
                  onChange={(e) =>
                    edit((d) => {
                      const a = d.activities[i]!;
                      if (a.type === "quiz.single_choice")
                        a.validation.correctOptionId = option.id;
                      else if (a.type === "quiz.multiple_choice")
                        a.validation.correctOptionIds = e.target.checked
                          ? [...a.validation.correctOptionIds, option.id]
                          : a.validation.correctOptionIds.filter(
                              (k) => k !== option.id
                            );
                    })
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
                    const a = d.activities[i]!;
                    if (a.type !== "quiz.short_text")
                      move(a.presentation.options, j, o);
                  })
                }
                onRemove={() =>
                  edit((d) => {
                    const a = d.activities[i]!;
                    if (a.type !== "quiz.short_text")
                      a.presentation.options.splice(j, 1);
                  })
                }
              />
            </fieldset>
          ))}
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              edit((d) => {
                const a = d.activities[i]!;
                if (a.type !== "quiz.short_text")
                  a.presentation.options.push({ id: "", text: "" });
              })
            }
          >
            Добавить вариант
          </Button>
        </>
      )}
      <Field
        label="Объяснение автора"
        multiline
        value={activity.validation.explanation}
        maxLength={10000}
        onChange={(v) =>
          edit((d) => {
            d.activities[i]!.validation.explanation = v;
          })
        }
      />
      <Order
        label={`Задание ${i + 1}`}
        index={i}
        count={document.activities.length}
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
