"use client";
import Link from "next/link";
import { useState } from "react";

import {
  RANKS,
  SKILL_MAP,
  characterProgress
} from "../../lib/skill-map/skill-map";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import { CharacterStage, stageColours } from "./character-stage";
import { hasBody } from "./three/meta";
import styles from "./lesson-companion.module.css";

/** The next rank's threshold above a level, or null at the top. */
function nextRank(level: number) {
  return RANKS.find((rank) => rank.from > level) ?? null;
}

/**
 * The course's character beside a lesson, as a compact strip under the course programme
 * (owner, 2026-11-06: the programme must stay readable) (owner, 2026-11-06): the learner sees it grow while
 * studying. A confirmed skill makes it celebrate, and a new rank is announced. Each course is
 * its character's course (html → HTML), so the course slug picks the character.
 */
export function LessonCompanion({ courseSlug }: { courseSlug: string }) {
  const character = SKILL_MAP.characters.find((c) => c.slug === courseSlug);
  const { status, records } = useOwnSkillRecords();
  const progress = character
    ? characterProgress(character, records, utcToday())
    : null;
  // The level and rank when the page opened, to say what this session has earned.
  const [start, setStart] = useState<{ level: number; rank: string } | null>(
    null
  );
  if (progress && status === "ready" && start === null)
    setStart({ level: progress.level, rank: progress.rank });

  if (!character || !progress || !hasBody(character.slug)) return null;
  const level = (progress.level / progress.maxLevel) * 100;
  const next = nextRank(progress.level);
  const gained = start ? progress.level - start.level : 0;
  const newRank = start && progress.rank !== start.rank ? progress.rank : null;
  return (
    <section
      className={styles.companion}
      aria-labelledby="companion-title"
      style={stageColours(character.slug)}
    >
      <div className={styles.figure}>
        <CharacterStage slug={character.slug} level={level} compact />
      </div>
      <div className={styles.info}>
        <div className={styles.head}>
          <h2 id="companion-title" className={styles.title}>
            Ваш персонаж ·{" "}
            <Link href={`/characters/${character.slug}`}>{character.name}</Link>
          </h2>
          <span className={styles.rank}>
            Уровень {progress.level} · {progress.rank}
          </span>
        </div>
        <progress
          className={styles.meter}
          max={progress.maxLevel}
          value={progress.level}
          aria-label={`${character.name}: уровень ${progress.level} из ${progress.maxLevel}`}
        />
        <p className={styles.note} role="status">
          {newRank
            ? `Новый ранг: ${newRank}! Посмотрите, что у него появилось.`
            : gained > 0
              ? `+${gained} к уровню за этот урок. Так держать!`
              : status === "anonymous"
                ? "Войдите, чтобы ваши тесты прокачивали персонажа."
                : next
                  ? `До ранга «${next.title}»: ${next.from - progress.level} ур. Сдайте тест урока — персонаж вырастет.`
                  : "Максимальный ранг. Повторяйте навыки, чтобы они не тускнели."}
        </p>
      </div>
    </section>
  );
}
