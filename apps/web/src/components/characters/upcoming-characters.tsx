import { UPCOMING } from "../../lib/skill-map/upcoming";
import styles from "./characters.module.css";

/** «Скоро»: announced characters by district, without levels. */
export function UpcomingCharacters() {
  return (
    <section className={styles.upcoming} aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className={styles.name}>
        Скоро в городе
      </h2>
      <p className={styles.summary}>
        Новые персонажи появляются, когда их технология покрыта целиком: все
        возможности, уроки и тесты.
      </p>
      {UPCOMING.map((group) => (
        <section
          key={group.district}
          className={styles.upcomingDistrict}
          aria-labelledby={`upcoming-${group.district}`}
        >
          <h3 id={`upcoming-${group.district}`} className={styles.branchTitle}>
            {group.district}
          </h3>
          <ul className={styles.upcomingList}>
            {group.characters.map((character) => (
              <li key={character.name} className={styles.upcomingCard}>
                <span className={styles.skillTitle}>{character.name}</span>
                <span className={styles.skillState}>{character.role}</span>
                <span className={styles.skillState}>
                  Стоит на: {character.needs}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
