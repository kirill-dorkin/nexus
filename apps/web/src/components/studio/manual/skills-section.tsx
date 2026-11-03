"use client";
import type { CourseManifestV1 } from "@platform/contracts";
import { Button } from "@platform/ui";
import { itemAt } from "../../../lib/item-at";
import { move } from "../editor-model";
import { addSkill, removeSkill, renameSkill } from "../editor-commands";
import styles from "../studio.module.css";
import { Order, TextField, type Edit } from "./controls";

export function SkillsSection({
  skills,
  edit
}: {
  skills: CourseManifestV1["skills"];
  edit: Edit;
}) {
  return (
    <section className={styles.card} id="studio-skills" aria-label="Навыки">
      <h2>Навыки</h2>
      <p>Ключи связывают задания с навыками курса.</p>
      {skills.map((skill, i) => (
        <fieldset key={i}>
          <legend>Навык {i + 1}</legend>
          <TextField
            label="Ключ навыка"
            value={skill.key}
            maxLength={63}
            onChange={(v) => edit((d) => renameSkill(d, i, v))}
          />
          <TextField
            label="Название навыка"
            value={skill.title}
            maxLength={200}
            onChange={(v) =>
              edit((d) => {
                itemAt(d.skills, i).title = v;
              })
            }
          />
          <TextField
            label="Описание навыка"
            multiline
            value={skill.description}
            maxLength={5000}
            onChange={(v) =>
              edit((d) => {
                itemAt(d.skills, i).description = v;
              })
            }
          />
          <Order
            label={`Навык ${i + 1}`}
            index={i}
            count={skills.length}
            onMove={(o) => edit((d) => move(d.skills, i, o))}
            onRemove={() => edit((d) => removeSkill(d, i))}
          />
        </fieldset>
      ))}
      <Button variant="secondary" type="button" onClick={() => edit(addSkill)}>
        Добавить навык
      </Button>
    </section>
  );
}
