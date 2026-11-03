"use client";
import { type CSSProperties } from "react";
import { CodeSnippet } from "../code-snippet";
import styles from "../story.module.css";
import {
  CHARACTERS,
  conceptKind,
  KIND_LABEL,
  type Concept,
  type ConceptKind
} from "./model";
import { AutoHeightPreview, RunPreview, SqlPreview } from "./previews";
import { Avatar, Rich } from "./rich";

export function ConceptCard({ concept }: { concept: Concept }) {
  const kind: ConceptKind = concept.kind ?? conceptKind(concept.name);
  return (
    <section
      className={styles.concept}
      data-kind={kind}
      aria-label={`${concept.name}: ${concept.title}`}
    >
      <header className={styles.conceptHead}>
        <span className={styles.kind}>{KIND_LABEL[kind]}</span>
        <div className={styles.nameRow}>
          {kind === "idea" ? (
            <span className={styles.name}>{concept.name}</span>
          ) : (
            <code className={styles.name}>{concept.name}</code>
          )}
          <h3 className={styles.conceptTitle}>{concept.title}</h3>
        </div>
      </header>
      <dl className={styles.rows}>
        <div className={styles.row} data-row="what">
          <dt>Что это</dt>
          <dd>
            <Rich text={concept.what} />
          </dd>
        </div>
        <div className={styles.row} data-row="why">
          <dt>Зачем</dt>
          <dd>
            <Rich text={concept.why} />
          </dd>
        </div>
        {concept.how ? (
          <div className={styles.row} data-row="how">
            <dt>Как</dt>
            <dd>
              <div
                className={styles.howGrid}
                data-preview={concept.show ? "" : undefined}
              >
                <CodeSnippet
                  code={concept.how}
                  language={concept.lang ?? "html"}
                />
                {concept.show ? (
                  <div className={styles.preview}>
                    <span>
                      {concept.lang === "js"
                        ? "Так это работает"
                        : concept.lang === "sql"
                          ? "Что ответит база"
                          : "Так это выглядит"}
                    </span>
                    {concept.lang === "js" ? (
                      <RunPreview
                        title={`Пример: ${concept.title}`}
                        code={concept.how}
                        page={concept.page}
                        initial={concept.show}
                      />
                    ) : concept.lang === "sql" ? (
                      <SqlPreview code={concept.how} />
                    ) : (
                      <AutoHeightPreview
                        title={`Пример: ${concept.title}`}
                        html={concept.how}
                        initial={concept.show}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </dd>
          </div>
        ) : null}
        {concept.bro ? (
          <div
            className={styles.row}
            data-row="bro"
            style={{ "--c": CHARACTERS.bro.color } as CSSProperties}
          >
            <dt>Бро</dt>
            <dd className={styles.broLine}>
              <Avatar who="bro" />
              <span>
                <Rich text={concept.bro} />
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
