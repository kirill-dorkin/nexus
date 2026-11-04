import { Alert, Heading, Text } from "@platform/ui";
import { CURRENT_LEGAL_DOCUMENT_VERSIONS } from "@platform/contracts";
import type { LegalDocument } from "@platform/contracts";
import { LearningShell } from "../learning/learning-shell";
import styles from "./legal.module.css";

/**
 * Page frame for a legal document whose text the owner has not supplied yet. It lists only the
 * section headings the owner has to fill; it deliberately contains no legal wording or operator
 * details. Replace `sections` with the approved text and bump the document version.
 */
export function LegalDocumentPlaceholder({
  title,
  document,
  sections
}: {
  title: string;
  document: LegalDocument;
  sections: readonly string[];
}) {
  return (
    <LearningShell>
      <article className={styles.document} aria-labelledby="legal-title">
        <Heading level={1} size="section" id="legal-title">
          {title}
        </Heading>
        <Alert tone="warning">
          Черновик. Текст документа и реквизиты оператора ещё не утверждены
          владельцем сервиса.
        </Alert>
        <Text muted>Версия: {CURRENT_LEGAL_DOCUMENT_VERSIONS[document]}</Text>
        <ol className={styles.sections}>
          {sections.map((section) => (
            <li key={section}>
              <h2>{section}</h2>
              <p className={styles.placeholder}>
                [Текст раздела предоставит владелец]
              </p>
            </li>
          ))}
        </ol>
      </article>
    </LearningShell>
  );
}
