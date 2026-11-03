"use client";
import styles from "../studio.module.css";
import type { Offerings } from "./use-offerings";

/** Creates a private self-paced offering; publishing it is a separate step. */
export function NewOfferingForm({ manager }: { manager: Offerings }) {
  const locked = manager.busy || manager.uncertain;
  return (
    <section className={styles.card}>
      <h2>Новый доступ</h2>
      <p>
        Для первого бесплатного курса используйте самостоятельный формат и
        доступ по членству. Новое предложение останется приватным, пока вы не
        подтвердите публикацию.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void manager.create();
        }}
      >
        <label>
          Название
          <input
            required
            maxLength={160}
            value={manager.name}
            onChange={(event) => manager.setName(event.target.value)}
            disabled={locked}
          />
        </label>
        <label>
          Адрес курса (slug)
          <input
            required
            minLength={2}
            maxLength={63}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={manager.slug}
            onChange={(event) => manager.setSlug(event.target.value)}
            disabled={locked}
          />
        </label>
        <button className={styles.primary} disabled={locked} type="submit">
          Создать приватный доступ
        </button>
      </form>
      {manager.uncertain && (
        <p role="alert">
          Результат предыдущего изменения не подтверждён. Не повторяйте запрос:
          сначала обновите список, чтобы избежать дубликатов.
        </p>
      )}
    </section>
  );
}
