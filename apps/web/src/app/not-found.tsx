import type { Metadata } from "next";
import { ButtonLink } from "@platform/ui";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { LearningShell } from "../components/learning/learning-shell";
import styles from "../components/learning/not-found.module.css";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false }
};

export default function NotFound() {
  return (
    <LearningShell>
      <section className={styles.page} aria-labelledby="not-found-title">
        <p className={styles.code} aria-hidden="true">404</p>
        <h1 id="not-found-title">Такой страницы нет</h1>
        <p>Возможно, ссылка устарела или в адресе опечатка.</p>
        <div className={styles.actions}>
          <ButtonLink href="/courses" size="lg">
            Смотреть курсы <ArrowRightIcon size={18} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            На главную
          </ButtonLink>
        </div>
      </section>
    </LearningShell>
  );
}
