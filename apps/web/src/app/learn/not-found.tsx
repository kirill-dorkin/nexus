import { ButtonLink } from "@platform/ui";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { LearningShell } from "../../components/learning/learning-shell";
import styles from "../../components/learning/not-found.module.css";

export default function LearningNotFound() {
  return (
    <LearningShell>
      <section className={styles.page} aria-labelledby="learn-not-found-title">
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 id="learn-not-found-title">Курс или урок недоступен</h1>
        <p>Он мог быть закрыт, или ссылка изменилась.</p>
        <div className={styles.actions}>
          <ButtonLink href="/courses" size="lg">
            Посмотреть доступные курсы{" "}
            <ArrowRightIcon size={18} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </LearningShell>
  );
}
