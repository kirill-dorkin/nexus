import Link from "next/link";
import { LearningShell } from "../../components/learning/learning-shell";
import styles from "../../components/learning/learning.module.css";
export default function LearningNotFound() {
  return (
    <LearningShell>
      <section className={styles.hero}>
        <h1>Курс или урок недоступен</h1>
        <p className={styles.lead}>Он мог быть закрыт или ссылка изменилась.</p>
        <Link className={styles.button} href="/courses">
          Посмотреть доступные курсы
        </Link>
      </section>
    </LearningShell>
  );
}
