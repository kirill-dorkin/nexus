"use client";
import styles from "../components/learning/learning.module.css";
export default function PageError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>Не удалось загрузить страницу</h1>
        <p className={styles.lead}>Попробуйте ещё раз через минуту.</p>
        <button className={styles.button} type="button" onClick={reset}>
          Повторить загрузку
        </button>
      </section>
    </main>
  );
}
