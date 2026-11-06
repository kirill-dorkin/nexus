import Link from "next/link";
import type { CSSProperties } from "react";

import { LEARNING_ROUTE } from "../../lib/learning-route";
import { SKILL_MAP } from "../../lib/skill-map/skill-map";
import { BODY_UI, hasBody } from "./three/meta";
import styles from "./route-characters.module.css";

/**
 * The «IT с нуля» route as its six characters, for the home page. Still portraits (drawn once
 * from the 3D figures at the Мастер look) keep the home page light: no three.js here.
 */
export function RouteCharacters() {
  const cast = LEARNING_ROUTE.steps.flatMap((step, i) => {
    const character = SKILL_MAP.characters.find((c) => c.slug === step.slug);
    return character && hasBody(character.slug)
      ? [{ character, step: i + 1 }]
      : [];
  });
  if (cast.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="cast-title">
      <div className={styles.head}>
        <p className={styles.kicker}>Персонажи</p>
        <h2 id="cast-title">
          Каждый курс — персонаж, который растёт вместе с вами
        </h2>
        <p className={styles.lead}>
          Сдаёте тесты — персонаж получает уровни и меняет облик: от Новичка до
          Эксперта. Не повторяете — навыки тускнеют.
        </p>
      </div>
      <ul className={styles.cast}>
        {cast.map(({ character, step }) => {
          const [glow, , , deep] =
            BODY_UI[character.slug as keyof typeof BODY_UI];
          return (
            <li
              key={character.slug}
              className={styles.card}
              style={{ "--glow": glow, "--deep": deep } as CSSProperties}
            >
              <span className={styles.step}>Шаг {step}</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- a small static WebP */}
              <img
                className={styles.figure}
                src={`/images/characters/${character.slug}.webp`}
                alt=""
                width={360}
                height={360}
                loading="lazy"
                decoding="async"
              />
              <h3 className={styles.name}>
                <Link href={`/courses/${character.slug}`}>
                  {character.name}
                </Link>
              </h3>
              <p className={styles.role}>{character.role}</p>
            </li>
          );
        })}
      </ul>
      <Link className={styles.more} href="/characters">
        Все персонажи и их навыки
      </Link>
    </section>
  );
}
