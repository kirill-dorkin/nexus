"use client";
import Link from "next/link";
import { buttonClass } from "@platform/ui";

import {
  RANKS,
  characterProgress,
  type Character,
  type CharacterProgress
} from "../../lib/skill-map/skill-map";
import { requiredCharacters } from "../../lib/skill-map/required-characters";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { nextActionLabel, skillsWord } from "./character-labels";
import { initials } from "./character-roster";
import { CharacterStage } from "./character-stage";
import { SkillTree, lessonHref } from "./character-skill-tree";
import { hasBody } from "./three/meta";
import type { BranchScene } from "../../lib/skill-map/story";
import styles from "./characters.module.css";

/** How many levels are left to the next look (the looks change at the site's ranks). */
export function nextLook(
  progress: Pick<CharacterProgress, "level" | "maxLevel">
): { title: string; levels: number } | null {
  const percent = (progress.level / progress.maxLevel) * 100;
  const rank = RANKS.slice(0, 5).find(({ from }) => from > percent);
  if (!rank) return null;
  const at = Math.ceil((rank.from / 100) * progress.maxLevel);
  return { title: rank.title, levels: Math.max(at - progress.level, 1) };
}

function levelsWord(n: number) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "уровень";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "уровня";
  return "уровней";
}

/** One character: a game-style hero (3D body, rank, level, next step) and the skill tree. */
export function CharacterProfile({
  character,
  scenes = {}
}: {
  character: Character;
  scenes?: Readonly<Record<string, BranchScene>>;
}) {
  const { status, records } = useOwnSkillRecords();
  const progress = characterProgress(character, records, utcToday());
  const builtOn = requiredCharacters(character);
  const nextHref = progress.next ? lessonHref(progress.next.skill) : null;
  const started = status === "ready" && progress.xp > 0;
  const look = nextLook(progress);
  const guest = status === "anonymous" || status === "error";
  return (
    <article className={styles.profile} data-ui-accent={character.accent}>
      <div className={styles.hero}>
        <CharacterStage
          slug={character.slug}
          level={(progress.level / progress.maxLevel) * 100}
          guest={guest}
        />
        <header className={styles.profileHead}>
          <div className={styles.profileTitle}>
            {!hasBody(character.slug) && (
              <span className={styles.portraitLarge} aria-hidden="true">
                {initials(character)}
              </span>
            )}
            <div>
              <p className={styles.kicker}>Персонаж</p>
              <h1 className={styles.heroName}>{character.name}</h1>
              <p className={styles.role}>{character.role}</p>
            </div>
          </div>
          <p className={styles.summary}>{character.summary}</p>
          <div className={styles.rankRow} aria-busy={status === "loading"}>
            <span className={styles.rankBadge}>{progress.rank}</span>
            <span>
              Уровень <strong>{progress.level}</strong> из {progress.maxLevel}
            </span>
          </div>
          <progress
            className={styles.meter}
            max={progress.maxLevel}
            value={progress.level}
            aria-label={`Уровень ${progress.level} из ${progress.maxLevel}`}
          />
          {look && (
            <p className={styles.lookHint}>
              Новый облик «{look.title}» — через {look.levels}{" "}
              {levelsWord(look.levels)}
            </p>
          )}
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Опыт</dt>
              <dd>{progress.xp}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Активные навыки</dt>
              <dd>
                {progress.active} из {progress.total}
              </dd>
            </div>
          </dl>
          {progress.next && nextHref ? (
            <div className={styles.heroActions}>
              <Link className={buttonClass({ size: "lg" })} href={nextHref}>
                {started ? "Продолжить" : "Начать прокачку"}
              </Link>
              <span className={styles.nextLine}>
                {nextActionLabel[progress.next.action]}:{" "}
                {progress.next.skill.title}
              </span>
            </div>
          ) : (
            character.published && (
              <div className={styles.heroActions}>
                <Link
                  className={buttonClass({ size: "lg" })}
                  href={`/courses/${encodeURIComponent(character.slug)}`}
                >
                  Открыть курс
                </Link>
              </div>
            )
          )}
          {status === "anonymous" && (
            <p className={styles.note}>
              <Link
                href={`${learningLoginUrl(`/characters/${character.slug}`)}&mode=register`}
              >
                Создайте аккаунт
              </Link>
              , чтобы персонаж запоминал ваши навыки и рос.
            </p>
          )}
          {builtOn.length > 0 && (
            <nav aria-label="Стоит на персонажах" className={styles.note}>
              Стоит на:{" "}
              {builtOn.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && ", "}
                  <Link href={`/characters/${c.slug}`}>{c.name}</Link>
                </span>
              ))}
            </nav>
          )}
        </header>
      </div>

      {progress.abilities.length > 0 && (
        <section aria-labelledby="abilities-title">
          <h2 id="abilities-title" className={styles.sectionTitle}>
            Способности
          </h2>
          <ul className={styles.abilities}>
            {progress.abilities.map(
              ({ ability, active, activeSkills, totalSkills }) => (
                <li
                  key={ability.title}
                  className={styles.ability}
                  data-active={active || undefined}
                >
                  <span className={styles.skillTitle}>{ability.title}</span>
                  <span className={styles.skillState}>
                    {active
                      ? "Активна"
                      : `${activeSkills} из ${totalSkills} ${skillsWord(totalSkills)}`}
                  </span>
                  <progress
                    className={styles.branchMeter}
                    max={Math.max(totalSkills, 1)}
                    value={activeSkills}
                    aria-hidden="true"
                  />
                </li>
              )
            )}
          </ul>
        </section>
      )}

      <SkillTree
        character={character}
        branches={progress.branches}
        scenes={scenes}
      />
    </article>
  );
}
