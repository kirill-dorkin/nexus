"use client";
import Link from "next/link";
import { buttonClass } from "@platform/ui";

import {
  characterProgress,
  requiredCharacters,
  type Character,
  type SkillMapSkill
} from "../../lib/skill-map/skill-map";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import {
  skillTestHref,
  useOwnSkillTests
} from "../../lib/skill-map/own-tests";
import { learningLoginUrl } from "../../lib/learning-return-to";
import {
  nextActionLabel,
  skillActionLabel,
  skillStateText,
  skillsWord
} from "./character-labels";
import { initials } from "./character-roster";
import { BranchSceneView } from "./branch-scene";
import type { BranchScene } from "../../lib/skill-map/story";
import styles from "./characters.module.css";

const lessonHref = (skill: SkillMapSkill) =>
  skill.lesson
    ? `/courses/${encodeURIComponent(skill.lesson.course)}/${encodeURIComponent(skill.lesson.slug)}`
    : null;

/** One character: level, rank, what to do next and the whole skill tree with its states. */
export function CharacterProfile({
  character,
  scenes = {}
}: {
  character: Character;
  scenes?: Readonly<Record<string, BranchScene>>;
}) {
  const { status, records } = useOwnSkillRecords();
  const tested = useOwnSkillTests();
  const progress = characterProgress(character, records, utcToday());
  const builtOn = requiredCharacters(character);
  // ADR-0075: a skill with a bank is confirmed by its test; otherwise by its lesson.
  const actionHref = (skill: SkillMapSkill) =>
    tested.has(skill.key)
      ? skillTestHref(character.slug, skill.key)
      : lessonHref(skill);
  const nextHref = progress.next ? actionHref(progress.next.skill) : null;
  const nextIsTest = progress.next ? tested.has(progress.next.skill.key) : false;
  return (
    <article className={styles.profile} data-ui-accent={character.accent}>
      <header className={styles.profileHead}>
        <div className={styles.profileTitle}>
          <span className={styles.portraitLarge} aria-hidden="true">
            {initials(character)}
          </span>
          <div>
            <h1 className={styles.name}>{character.name}</h1>
            <p className={styles.role}>{character.role}</p>
          </div>
        </div>
        <p className={styles.summary}>{character.summary}</p>
        <dl className={styles.stats} aria-busy={status === "loading"}>
          <div className={styles.stat}>
            <dt>Уровень</dt>
            <dd>
              {progress.level} из {progress.maxLevel}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>Ранг</dt>
            <dd>{progress.rank}</dd>
          </div>
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
        <progress
          className={styles.meter}
          max={progress.maxLevel}
          value={progress.level}
          aria-label={`Уровень ${progress.level} из ${progress.maxLevel}`}
        />
        {status === "anonymous" && (
          <p className={styles.summary}>
            <Link
              href={`${learningLoginUrl(`/characters/${character.slug}`)}&mode=register`}
            >
              Создайте аккаунт
            </Link>
            , чтобы подтверждать навыки и прокачивать персонажа.
          </p>
        )}
      </header>

      {progress.next && (
        <section className={styles.next} aria-label="Что дальше">
          <p>
            <strong>{nextActionLabel[progress.next.action]}:</strong>{" "}
            {progress.next.skill.title}
          </p>
          {nextHref && (
            <Link className={buttonClass({ size: "sm" })} href={nextHref}>
              {nextIsTest ? "К тесту" : "К уроку"}
            </Link>
          )}
        </section>
      )}

      {builtOn.length > 0 && (
        <section aria-labelledby="built-on">
          <h2 id="built-on" className={styles.name}>
            Стоит на персонажах
          </h2>
          <ul className={styles.requires}>
            {builtOn.map((c) => (
              <li key={c.slug}>
                <Link
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                  href={`/characters/${c.slug}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.branches} aria-labelledby="skill-tree">
        <h2 id="skill-tree" className={styles.name}>
          Навыки
        </h2>
        {progress.branches.map(({ branch, unlocked, active, skills }) => (
          <section
            key={branch.id}
            className={styles.branch}
            aria-labelledby={`branch-${branch.id}`}
          >
            <div className={styles.branchHead}>
              <h3 id={`branch-${branch.id}`}>{branch.title}</h3>
              <span className={styles.branchMeta}>
                {unlocked
                  ? `Активно ${active} из ${skills.length}`
                  : `Закрыта: ${skills.length} ${skillsWord(skills.length)}`}
              </span>
            </div>
            <BranchSceneView
              scene={scenes[branch.id]}
              restored={active === skills.length && skills.length > 0}
            />
            <ul className={styles.skills}>
              {skills.map((item) => {
                const href = actionHref(item.skill);
                return (
                  <li
                    key={item.skill.key}
                    className={styles.skill}
                    data-state={item.state}
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.skillText}>
                      <span className={styles.skillTitle}>
                        {item.skill.title}
                      </span>
                      <span className={styles.skillState}>
                        {skillStateText(item)}
                      </span>
                    </span>
                    {href && (
                      <Link
                        className={styles.skillAction}
                        href={href}
                        aria-label={`${skillActionLabel[item.state]}: ${item.skill.title}`}
                      >
                        {skillActionLabel[item.state]}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>
    </article>
  );
}
