"use client";
import Link from "next/link";

import {
  SKILL_MAP,
  characterProgress,
  type Character
} from "../../lib/skill-map/skill-map";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import { LEARNING_ROUTE } from "../../lib/learning-route";
import { skillsWord } from "./character-labels";
import { DailyPanel } from "./daily-panel";
import { stageColours, usePortraits } from "./character-stage";
import { hasBody } from "./three/meta";
import styles from "./characters.module.css";
import stageStyles from "./character-stage.module.css";

/** Two letters for the portrait until characters get their illustrations. */
export const initials = (character: Character) =>
  character.name.replace(/[^A-Za-zА-Яа-яЁё]/g, "").slice(0, 2);

/** All characters with the learner's level; anonymous visitors see level 0. */
export function CharacterRoster() {
  const { status, records } = useOwnSkillRecords();
  const today = utcToday();
  const levels = SKILL_MAP.characters.map((character) => {
    const progress = characterProgress(character, records, today);
    return { character, progress };
  });
  const portraits = usePortraits(
    status === "loading"
      ? []
      : levels
          .filter(({ character }) => hasBody(character.slug))
          .map(({ character, progress }) => ({
            slug: character.slug,
            // Without the learner's own records (a guest, or the API unreachable) the card
            // shows what the character grows into (Мастер); learners see their own level.
            level:
              status === "ready"
                ? (progress.level / progress.maxLevel) * 100
                : 70
          }))
  );
  return (
    <>
      {status === "ready" && <DailyPanel records={records} today={today} />}
      <ul className={styles.roster} aria-busy={status === "loading"}>
        {levels.map(({ character, progress }) => {
          const portrait = portraits[character.slug];
          const step = LEARNING_ROUTE.steps.findIndex(
            (s) => s.slug === character.slug
          );
          return (
            <li
              key={character.slug}
              className={styles.card}
              data-ui-accent={character.accent}
            >
              {step >= 0 && (
                <span className={styles.stepBadge}>
                  Шаг {step + 1} из {LEARNING_ROUTE.steps.length}
                </span>
              )}
              {portrait && (
                // A data URL drawn in the browser; next/image cannot optimise it.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={stageStyles.portrait}
                  style={stageColours(character.slug)}
                  src={portrait}
                  alt=""
                  width={360}
                  height={360}
                />
              )}
              <div className={styles.cardHead}>
                {!portrait && (
                  <span className={styles.portrait} aria-hidden="true">
                    {initials(character)}
                  </span>
                )}
                <div>
                  <h2 className={styles.name}>
                    <Link href={`/characters/${character.slug}`}>
                      {character.name}
                    </Link>
                  </h2>
                  <p className={styles.role}>{character.role}</p>
                </div>
              </div>
              <p className={styles.summary}>{character.summary}</p>
              <div className={styles.levelLine}>
                <span>
                  Уровень <strong>{progress.level}</strong> · {progress.rank}
                </span>
                <span>
                  {progress.active} из {progress.total}{" "}
                  {skillsWord(progress.total)}
                </span>
              </div>
              <progress
                className={styles.meter}
                max={progress.maxLevel}
                value={progress.level}
                aria-label={`${character.name}: уровень ${progress.level} из ${progress.maxLevel}`}
              />
              <ul className={styles.tags}>
                {!character.published && <li className={styles.tag}>Скоро</li>}
                {progress.fading > 0 && (
                  <li className={styles.tagWarn}>
                    Тускнеют: {progress.fading}
                  </li>
                )}
                {progress.forgotten > 0 && (
                  <li className={styles.tagWarn}>
                    Забыты: {progress.forgotten}
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}
