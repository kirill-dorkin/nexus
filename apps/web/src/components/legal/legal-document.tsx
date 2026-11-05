import type { ReactNode } from "react";
import { Heading, Text } from "@platform/ui";
import { LearningShell } from "../learning/learning-shell";
import styles from "./legal.module.css";

export const LEGAL_CONTACT = Object.freeze({
  email: "kirilldorkin.ru@gmail.com",
  whatsappLabel: "+996 999 901 631",
  whatsappUrl: "https://wa.me/996999901631"
});

/** Email and WhatsApp contacts of the operator, as links. */
export function LegalContacts() {
  return (
    <ul>
      <li>
        электронная почта:{" "}
        <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a>;
      </li>
      <li>
        WhatsApp:{" "}
        <a href={LEGAL_CONTACT.whatsappUrl} rel="noopener noreferrer">
          {LEGAL_CONTACT.whatsappLabel}
        </a>
        .
      </li>
    </ul>
  );
}

/** Frame of a legal document: title, version and date, numbered sections. */
export function LegalDocument({
  title,
  version,
  date,
  children
}: {
  title: string;
  version: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <LearningShell>
      <article className={styles.document} aria-labelledby="legal-title">
        <Heading level={1} size="section" id="legal-title">
          {title}
        </Heading>
        <Text muted>
          Редакция {version}, действует с {date}.
        </Text>
        <div className={styles.body}>{children}</div>
      </article>
    </LearningShell>
  );
}
