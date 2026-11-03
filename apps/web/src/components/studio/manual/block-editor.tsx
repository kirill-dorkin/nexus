"use client";
import type { CourseManifestV1, LessonBlock } from "@platform/contracts";
import { Select } from "@platform/ui";
import { itemAt } from "../../../lib/item-at";
import { move } from "../editor-model";
import { updateBlock } from "../editor-commands";
import styles from "../studio.module.css";
import { Order, TextField, type Edit } from "./controls";

const BLOCK_NAMES = {
  youtube: "Видео",
  markdown: "Конспект",
  activity: "Задание"
} as const;

/** One lesson block: a video, Markdown notes or a reference to an activity. */
export function BlockEditor({
  block,
  lesson: i,
  index: j,
  count,
  activities,
  edit
}: {
  block: LessonBlock;
  lesson: number;
  index: number;
  count: number;
  activities: CourseManifestV1["activities"];
  edit: Edit;
}) {
  return (
    <fieldset>
      <legend>
        Блок {j + 1}: {BLOCK_NAMES[block.type]}
      </legend>
      {block.type === "youtube" && (
        <TextField
          label="YouTube URL или ID"
          hint="Вставьте ссылку youtube.com или youtu.be. Плеер загрузится только по нажатию ученика; при недоступности останется ссылка на YouTube."
          value={block.videoId}
          maxLength={2048}
          onChange={(v) =>
            edit((d) =>
              updateBlock(d, i, j, "youtube", (b) => {
                b.videoId = v;
              })
            )
          }
        />
      )}
      {block.type === "markdown" && (
        <TextField
          label="Конспект (Markdown)"
          hint="Заголовки ##, списки, **выделение**, цитаты > и блоки кода ``` сохраняют структуру текста. Проверьте оформление во вкладке «Предпросмотр». HTML и внешние изображения отключены."
          multiline
          value={block.markdown}
          onChange={(v) =>
            edit((d) =>
              updateBlock(d, i, j, "markdown", (b) => {
                b.markdown = v;
              })
            )
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
                edit((d) =>
                  updateBlock(d, i, j, "activity", (b) => {
                    b.activitySlug = e.target.value;
                  })
                )
              }
            >
              <option value="">Выберите задание</option>
              {activities.map((a, k) => (
                <option key={k} value={a.slug}>
                  {a.title || a.slug || `Задание ${k + 1}`}
                </option>
              ))}
            </Select>
          </label>
          <TextField
            label="Заголовок блока (необязательно)"
            value={block.title ?? ""}
            maxLength={200}
            onChange={(v) =>
              edit((d) =>
                updateBlock(d, i, j, "activity", (b) => {
                  if (v) b.title = v;
                  else delete b.title;
                })
              )
            }
          />
          <label>
            Вид задания
            <Select
              value={block.kind}
              onChange={(e) =>
                edit((d) =>
                  updateBlock(d, i, j, "activity", (b) => {
                    b.kind =
                      e.target.value === "homework" ? "homework" : "practice";
                  })
                )
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
                edit((d) =>
                  updateBlock(d, i, j, "activity", (b) => {
                    b.required = e.target.checked;
                  })
                )
              }
            />
            Обязательное задание
          </label>
        </>
      )}
      <Order
        label={`Блок ${j + 1}`}
        index={j}
        count={count}
        onMove={(o) => edit((d) => move(itemAt(d.lessons, i).blocks, j, o))}
        onRemove={() =>
          edit((d) => {
            itemAt(d.lessons, i).blocks.splice(j, 1);
          })
        }
      />
    </fieldset>
  );
}
