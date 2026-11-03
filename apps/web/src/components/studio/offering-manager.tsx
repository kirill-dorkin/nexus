"use client";
import Link from "next/link";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { NewOfferingForm } from "./offering/new-offering-form";
import { OfferingCard } from "./offering/offering-card";
import { useOfferings } from "./offering/use-offerings";
import accessStyles from "./offering-manager.module.css";
import styles from "./studio.module.css";

/** Access to a published course: which offerings exist and who can see them. */
export function OfferingManager({
  organizationId,
  courseId
}: {
  organizationId: string;
  courseId: string;
}) {
  const manager = useOfferings(organizationId, courseId);
  const { access, ready, login, error, message, busy } = manager;
  return (
    <>
      <Link href={`/studio/${organizationId}/${courseId}`}>
        ← К редактору курса
      </Link>
      <h1>Доступ к опубликованному курсу</h1>
      <p>
        Публикация содержимого и открытие доступа — отдельные действия. Новый
        доступ всегда приватный.
      </p>
      {!ready && <p role="status">Загрузка…</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {login && (
        <p>
          <Link href={learningLoginUrl("/studio")}>Войти в Studio</Link>
        </p>
      )}
      {ready && !login && access && (
        <div className={styles.sections}>
          <section className={styles.card}>
            <h2>{access.course.manifest.course.title}</h2>
            <p>
              Версия {access.course.versionNumber} ·{" "}
              {access.course.status === "published"
                ? "Опубликована"
                : "Черновик"}
            </p>
            {access.course.status !== "published" ? (
              <p role="status">
                Эта версия ещё не опубликована. Сначала опубликуйте её в
                редакторе. Существующие Offerings других версий сохраняются и не
                изменяются автоматически.
              </p>
            ) : (
              <>
                <p>
                  Выберите существующий доступ или создайте новый.
                  Редактирование курса не изменяет уже опубликованную версию.
                </p>
                <button
                  disabled={busy}
                  type="button"
                  onClick={() => void manager.reload()}
                >
                  Обновить доступы
                </button>
              </>
            )}
          </section>
          {access.course.status === "published" && (
            <>
              <section className={styles.card}>
                <h2>Существующие доступы</h2>
                {access.offerings.length === 0 && (
                  <p>Для этой опубликованной версии доступов пока нет.</p>
                )}
                <div className={accessStyles.list}>
                  {access.offerings.map((offering) => (
                    <OfferingCard
                      key={offering.id}
                      offering={offering}
                      organizationSlug={access.organizationSlug}
                      manager={manager}
                    />
                  ))}
                </div>
                {access.cursor && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void manager.more()}
                  >
                    Загрузить ещё
                  </button>
                )}
              </section>
              <NewOfferingForm manager={manager} />
            </>
          )}
          <p className={accessStyles.note}>
            Для новой регистрации может потребоваться отдельно разрешить
            вступление в организацию (customer entry policy). Публичная ссылка
            сама по себе не выдаёт членство, запись на курс или платный доступ.
          </p>
        </div>
      )}
    </>
  );
}
