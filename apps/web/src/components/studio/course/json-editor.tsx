"use client";
import { Field, Heading, Input, Text, Textarea } from "@platform/ui";
import styles from "../studio.module.css";

/** The manifest as raw JSON, plus loading it from a file. */
export function JsonEditor({
  raw,
  onChange,
  onUpload
}: {
  raw: string;
  onChange: (text: string) => void;
  onUpload: (file: File | undefined) => Promise<void>;
}) {
  return (
    <section className={styles.jsonEditor}>
      <Heading level={2} size="section">
        Документ курса
      </Heading>
      <Field htmlFor="studio-manifest-json" label="Manifest JSON">
        <Textarea
          id="studio-manifest-json"
          className={styles.json}
          value={raw}
          maxLength={900000}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      </Field>
      <Field htmlFor="studio-json-file" label="Загрузить JSON-файл">
        <Input
          id="studio-json-file"
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void onUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Field>
      <Text muted size="sm">
        До 900 КБ. Загрузка файла меняет рабочую копию; сохранение на сервер
        выполняется отдельно.
      </Text>
    </section>
  );
}
