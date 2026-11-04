"use client";
import Link from "next/link";

import {
  SKILL_MAP,
  characterProgress,
  type Character
} from "../../lib/skill-map/skill-map";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import { skillsWord } from "./character-labels";
import { DailyPanel } from "./daily-panel";
import styles from "./characters.module.css";

/** Two letters for the portrait until characters get their illustrations. */
export const initials = (character: Character) =>
  character.name.replace(/[^A-Za-zА-Яа-яЁё]/g, "").slice(0, 2);

/** All characters with the learner's level; anonymous visitors see level 0. */
export function CharacterRoster() {
  const { status, records } = useOwnSkillRecords();
  const today = utcToday();
  return (
    <>
      {status === "ready" && <DailyPanel records={records} today={today} />}
      <ul className={styles.roster} aria-busy={status === "loading"}>
        {SKILL_MAP.characters.map((character) => {
          const progress = characterProgress(character, records, today);
          return (
            <li
              key={character.slug}
              className={styles.card}
              data-ui-accent={character.accent}
            >
              <div className={styles.cardHead}>
                <span className={styles.portrait} aria-hidden="true">
                  {initials(character)}
                </span>
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
